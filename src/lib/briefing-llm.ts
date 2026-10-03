import Anthropic from "@anthropic-ai/sdk"

// Writes the AI city briefing. DeepSeek is tried first; Claude is the fallback.

export type Briefing = { "zh-HK": string; "zh-CN": string; en: string }
export type BriefingKeys = { deepseek?: string; anthropic?: string }
export type Provider = keyof Writers
export type Writers = {
  deepseek: (key: string, system: string, facts: string) => Promise<string>
  anthropic: (key: string, system: string, facts: string) => Promise<string>
}

const DEEPSEEK_MODEL = "deepseek-flash"
const CLAUDE_MODEL = "claude-opus-5"
const MAX_CHARS = 400

export const MODELS: Record<Provider, string> = { deepseek: DEEPSEEK_MODEL, anthropic: CLAUDE_MODEL }

const SYSTEM = `You write a short live traffic briefing for a Hong Kong traffic map.
Use only the facts you are given. Add nothing they do not state: no causes, no predictions, no advice, and no status such as an incident being handled or cleared.
Lead with what matters most to someone about to travel now: incidents and warnings in force, then the fastest harbour crossing, then the worst congested roads.
Mention only the topics listed. If incidents or warnings are not listed, do not mention them at all.
At most three short sentences per language; keep the Chinese under 90 characters and the English under 250 characters.
Return json with exactly three keys:
- "zhHK": Traditional Chinese in Hong Kong written style (書面語, not spoken Cantonese: 是 not 係, 的 not 嘅, 現時 not 而家). Use Hong Kong names: 紅隧, 東隧, 西隧, 巴士, 港鐵. Never use Simplified characters.
- "zhCN": Simplified Chinese.
- "en": English.
Example: {"zhHK": "...", "zhCN": "...", "en": "..."}`

const SCHEMA = {
  type: "object",
  properties: { zhHK: { type: "string" }, zhCN: { type: "string" }, en: { type: "string" } },
  required: ["zhHK", "zhCN", "en"],
  additionalProperties: false,
}

export async function writeBriefing(
  facts: string,
  keys: BriefingKeys,
  writers: Writers = DEFAULT_WRITERS,
): Promise<{ text: Briefing; provider: Provider; model: string }> {
  const order: Provider[] = ["deepseek", "anthropic"]
  const failures: string[] = []
  for (const provider of order) {
    const key = keys[provider]
    if (!key) continue
    try {
      const raw = await writers[provider](key, SYSTEM, facts)
      const text = parseBriefing(raw)
      if (text) return { text, provider, model: MODELS[provider] }
      failures.push(`${provider}: ${briefingProblem(raw)}`)
    } catch (error) {
      failures.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  throw new Error(failures.length > 0 ? failures.join("; ") : "no AI provider key is set")
}

export function parseBriefing(raw: string): Briefing | null {
  const read = readBriefing(raw)
  return typeof read === "string" ? null : read
}

// Why an answer was rejected, or null when it is usable.
export function briefingProblem(raw: string): string | null {
  const read = readBriefing(raw)
  return typeof read === "string" ? read : null
}

function readBriefing(raw: string): Briefing | string {
  const json = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  if (!json) return "empty answer"
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return "not JSON"
  }
  if (!value || typeof value !== "object") return "not a JSON object"
  const fields = value as Record<string, unknown>
  const texts: string[] = []
  for (const key of ["zhHK", "zhCN", "en"]) {
    const text = typeof fields[key] === "string" ? fields[key].trim() : ""
    if (!text) return `${key} empty`
    if (text.length > MAX_CHARS) return `${key} too long (${text.length})`
    texts.push(text)
  }
  const [hk, cn, english] = texts as [string, string, string]
  return { "zh-HK": hk, "zh-CN": cn, en: english }
}

// DeepSeek has no TypeScript SDK; its chat API is plain JSON over HTTPS.
async function askDeepSeek(key: string, system: string, facts: string): Promise<string> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: facts },
      ],
      // A two-sentence summary needs no reasoning pass.
      thinking: { type: "disabled" },
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 1000,
      stream: false,
    }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const body = (await response.json()) as { choices?: { message?: { content?: string | null } }[] }
  return body.choices?.[0]?.message?.content ?? ""
}

async function askClaude(key: string, system: string, facts: string): Promise<string> {
  const client = new Anthropic({ apiKey: key, timeout: 30_000, maxRetries: 1 })
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: facts }],
    // A short restatement of given facts; low effort keeps it quick.
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    // On a refusal, the API reruns the request on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  })
  if (response.stop_reason === "refusal") throw new Error("refused")
  return response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("")
}

const DEFAULT_WRITERS: Writers = { deepseek: askDeepSeek, anthropic: askClaude }

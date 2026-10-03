import assert from "node:assert/strict"
import { parseBriefing, writeBriefing, type Writers } from "./briefing-llm.ts"

const good = JSON.stringify({ zhHK: "東隧最快，5 分鐘。", zhCN: "东隧最快，5 分钟。", en: "The Eastern Harbour Crossing is fastest at 5 min." })

// Output is checked before it reaches a visitor.
assert.deepEqual(parseBriefing(good), { "zh-HK": "東隧最快，5 分鐘。", "zh-CN": "东隧最快，5 分钟。", en: "The Eastern Harbour Crossing is fastest at 5 min." })
assert.deepEqual(parseBriefing("```json\n" + good + "\n```")?.en, "The Eastern Harbour Crossing is fastest at 5 min.")
assert.equal(parseBriefing(""), null)
assert.equal(parseBriefing("not json"), null)
assert.equal(parseBriefing(JSON.stringify({ zhHK: "ok", zhCN: "", en: "ok" })), null)
assert.equal(parseBriefing(JSON.stringify({ zhHK: "x".repeat(400), zhCN: "ok", en: "ok" })), null)

const calls: string[] = []
const writers = (deepseek: () => Promise<string>, anthropic: () => Promise<string>): Writers => ({
  deepseek: async () => {
    calls.push("deepseek")
    return deepseek()
  },
  anthropic: async () => {
    calls.push("anthropic")
    return anthropic()
  },
})

// DeepSeek first when it works.
calls.length = 0
const first = await writeBriefing("facts", { deepseek: "d", anthropic: "a" }, writers(async () => good, async () => good))
assert.equal(first.provider, "deepseek")
assert.deepEqual(calls, ["deepseek"])

// A failed or unusable DeepSeek answer falls back to Claude.
for (const broken of [async () => Promise.reject(new Error("HTTP 503")), async () => ""]) {
  calls.length = 0
  const fallback = await writeBriefing("facts", { deepseek: "d", anthropic: "a" }, writers(broken, async () => good))
  assert.equal(fallback.provider, "anthropic")
  assert.deepEqual(calls, ["deepseek", "anthropic"])
}

// Only the configured provider is tried.
calls.length = 0
assert.equal((await writeBriefing("facts", { anthropic: "a" }, writers(async () => good, async () => good))).provider, "anthropic")
assert.deepEqual(calls, ["anthropic"])

// No key, or every provider failing, is an error that names what happened.
await assert.rejects(writeBriefing("facts", {}, writers(async () => good, async () => good)), /no AI provider key/)
await assert.rejects(
  writeBriefing("facts", { deepseek: "d", anthropic: "a" }, writers(async () => Promise.reject(new Error("HTTP 503")), async () => "nope")),
  /deepseek: HTTP 503; anthropic: unusable answer/,
)

console.log("briefing llm ok")

import { GET as getApproaches } from "@/app/api/approaches/route"
import { GET as getIncidents } from "@/app/api/incidents/route"
import { GET as getTraffic } from "@/app/api/traffic/route"
import { GET as getWarnings } from "@/app/api/warnings/route"
import { briefingFacts, type BriefingInput } from "@/lib/briefing-facts"
import { writeBriefing, type Briefing, type BriefingKeys, type Provider } from "@/lib/briefing-llm"
import { bestCrossings } from "@/lib/crossings"
import type { ApproachesResponse, IncidentsResponse, TrafficResponse, WarningsResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

// One briefing per quarter hour, shared by every visitor, so AI calls stay at most 96 a day.
const WINDOW_MS = 15 * 60_000

type BriefingResponse =
  | { ok: true; at: string; provider: Provider; model: string; text: Briefing }
  | { ok: false; error: string }

const memory = new Map<number, BriefingResponse>()

export async function GET(request: Request) {
  const keys = await providerKeys()
  if (!keys.deepseek && !keys.anthropic) return json({ ok: false, error: "No AI provider key is set" }, 503)
  const window = Math.floor(Date.now() / WINDOW_MS)
  const kept = memory.get(window) ?? (await readShared(window))
  if (kept) return json(kept)
  try {
    const facts = briefingFacts(await gatherFacts(request))
    const written = await writeBriefing(facts, keys)
    const body: BriefingResponse = { ok: true, at: new Date().toISOString(), ...written }
    memory.clear()
    memory.set(window, body)
    await writeShared(window, body)
    return json(body)
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Briefing failed" }, 502)
  }
}

// Calls the site's own routes in-process, so the briefing reads the same feeds and cache as the map.
async function gatherFacts(request: Request): Promise<BriefingInput> {
  const read = async <T,>(pending: Promise<Response>): Promise<T | null> => {
    try {
      const response = await pending
      return response.ok ? ((await response.json()) as T) : null
    } catch {
      return null
    }
  }
  const origin = new URL(request.url).origin
  const [traffic, approaches, incidents, warnings] = await Promise.all([
    read<TrafficResponse>(getTraffic(new Request(`${origin}/api/traffic`))),
    read<ApproachesResponse>(getApproaches()),
    read<IncidentsResponse>(getIncidents()),
    read<WarningsResponse>(getWarnings(new Request(`${origin}/api/warnings?lang=en`))),
  ])
  return {
    at: new Date(),
    traffic: traffic?.ok ? traffic : null,
    crossings: bestCrossings(approaches?.ok ? approaches.points : []).map((row) => ({ code: row.code, minutes: row.minutes })),
    incidents: (incidents?.ok ? incidents.incidents.features : []).map((feature) => {
      const p = (feature.properties ?? {}) as Record<string, string | undefined>
      return { tc: p.nameTc ?? "", en: p.name ?? "", whereTc: p.location ?? "", whereEn: p.locationEn ?? "" }
    }),
    warnings: (warnings?.warnings ?? []).map((row) => ({ name: row.name })),
    conditions: warnings?.conditions ?? null,
  }
}

// Cloudflare secrets in the Worker; .env under the Node dev server.
async function providerKeys(): Promise<BriefingKeys> {
  let env: Record<string, unknown> = {}
  try {
    env = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "cloudflare:workers")).env
  } catch {
    // Not running in workerd.
  }
  const pick = (name: string) => {
    const value = env[name] ?? process.env[name]
    return typeof value === "string" && value.length > 0 ? value : undefined
  }
  return { deepseek: pick("DEEPSEEK_API_KEY"), anthropic: pick("ANTHROPIC_API_KEY") }
}

function shareKey(window: number): Request {
  return new Request(`https://briefing.internal/v1/${window}`)
}

async function sharedCache(): Promise<Cache | null> {
  const storage = globalThis.caches as (CacheStorage & { default?: Cache }) | undefined
  return storage?.default ?? null
}

async function readShared(window: number): Promise<BriefingResponse | null> {
  try {
    const hit = await (await sharedCache())?.match(shareKey(window))
    if (!hit) return null
    const body = (await hit.json()) as BriefingResponse
    memory.set(window, body)
    return body
  } catch {
    return null
  }
}

async function writeShared(window: number, body: BriefingResponse): Promise<void> {
  try {
    const seconds = Math.ceil(((window + 1) * WINDOW_MS - Date.now()) / 1000)
    await (await sharedCache())?.put(shareKey(window), Response.json(body, { headers: { "Cache-Control": `public, max-age=${Math.max(1, seconds)}` } }))
  } catch {
    // The briefing is still served; the next isolate writes its own.
  }
}

function json(body: BriefingResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": status === 200 ? "public, max-age=60" : "no-store" } })
}

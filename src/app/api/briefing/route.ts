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

type Env = Record<string, unknown> & { SELF?: { fetch: (request: Request) => Promise<Response> } }

export async function GET(request: Request) {
  const env = await workerEnv()
  const keys = providerKeys(env)
  // Not configured is a normal state for a deployment without AI, so it is not an HTTP error.
  if (!keys.deepseek && !keys.anthropic) return json({ ok: false, error: "No AI provider key is set" }, 200, "public, max-age=300")
  const window = Math.floor(Date.now() / WINDOW_MS)
  const kept = memory.get(window) ?? (await readShared(window))
  if (kept) return json(kept)
  try {
    const facts = briefingFacts(await gatherFacts(feedLoader(env, new URL(request.url).origin)))
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

// On Cloudflare each feed is read through the SELF binding, one request each: read in-process,
// the four feeds together passed the free plan's 50 subrequests per invocation on a cold cache.
// The Node dev server has no binding, so it calls the routes directly.
function feedLoader(env: Env, origin: string): (path: string) => Promise<Response> {
  const self = env.SELF
  if (self) return (path) => self.fetch(new Request(`${origin}${path}`))
  return (path) => {
    if (path.startsWith("/api/traffic")) return getTraffic(new Request(`${origin}${path}`))
    if (path.startsWith("/api/approaches")) return getApproaches()
    if (path.startsWith("/api/incidents")) return getIncidents()
    return getWarnings(new Request(`${origin}${path}`))
  }
}

async function gatherFacts(load: (path: string) => Promise<Response>): Promise<BriefingInput> {
  const read = async <T,>(pending: Promise<Response>): Promise<T | null> => {
    try {
      const response = await pending
      return response.ok ? ((await response.json()) as T) : null
    } catch {
      return null
    }
  }
  const [traffic, approaches, incidents, warnings] = await Promise.all([
    read<TrafficResponse>(load("/api/traffic")),
    read<ApproachesResponse>(load("/api/approaches")),
    read<IncidentsResponse>(load("/api/incidents")),
    read<WarningsResponse>(load("/api/warnings?lang=en")),
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

async function workerEnv(): Promise<Env> {
  try {
    return (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "cloudflare:workers")).env as Env
  } catch {
    return {} // Not running in workerd.
  }
}

// Cloudflare secrets in the Worker; .env under the Node dev server.
function providerKeys(env: Env): BriefingKeys {
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

function json(body: BriefingResponse, status = 200, cache = status === 200 ? "public, max-age=60" : "no-store") {
  return Response.json(body, { status, headers: { "Cache-Control": cache } })
}

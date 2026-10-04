import { aiKeys, askInput, barStart, feedLoader, readCityFeeds, readFeed, workerEnv } from "@/app/api/_city/feeds"
import { askFacts, otherSign } from "@/lib/ask-facts"
import { jevGuard, questionKey, RateLimit } from "@/lib/ask-guard"
import { allowQuestion, visitorKey } from "@/lib/ask-limit"
import type { HistoryDb } from "@/lib/history-store"
import type { ApproachesResponse } from "@/lib/types"
import { answerQuestion, type AskResult } from "@/lib/ask-llm"
import { localeOf } from "@/lib/i18n"

export const dynamic = "force-dynamic"

const MAX_QUESTION = 200
const MAX_PER_WINDOW = 5
const WINDOW_MS = 10 * 60_000
// Used only without D1 (the Node dev server); in the Worker the count is shared in D1.
const localLimit = new RateLimit(MAX_PER_WINDOW, WINDOW_MS)
const answered = new Map<string, AskBody>()

type AskBody =
  | ({ ok: true; at: string; barSign: { tc: string; en: string } | null } & Omit<AskResult, "model">)
  | { ok: false; code: "empty" | "too-long" | "rate" | "no-key" | "unreliable" | "failed"; error: string }

// Whether the question box should be shown at all.
export async function GET() {
  const keys = aiKeys(await workerEnv())
  return Response.json({ ok: true, available: Boolean(keys.deepseek || keys.anthropic) }, { headers: { "Cache-Control": "public, max-age=300" } })
}

export async function POST(request: Request) {
  const env = await workerEnv()
  const keys = aiKeys(env)
  if (!keys.deepseek && !keys.anthropic) return json({ ok: false, code: "no-key", error: "No AI provider key is set" })
  let payload: { question?: unknown; locale?: unknown; centre?: { lng?: unknown; lat?: unknown } }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    payload = {}
  }
  const question = typeof payload.question === "string" ? payload.question.trim() : ""
  const locale = localeOf(typeof payload.locale === "string" ? payload.locale : undefined)
  if (!question) return json({ ok: false, code: "empty", error: "Ask a question" }, 400)
  if (question.length > MAX_QUESTION) return json({ ok: false, code: "too-long", error: `At most ${MAX_QUESTION} characters` }, 400)

  const centre = readCentre(payload.centre)
  const load = feedLoader(env, new URL(request.url).origin)
  // Only the crossing feed before the cache and rate checks: it names the top bar's sign,
  // which is part of the cache key. The rest is read once the question will be answered.
  const sign = barStart(await readFeed<ApproachesResponse>(load, "/api/approaches"), centre)
  const key = questionKey(question, locale, Date.now(), sign ?? "")
  const kept = answered.get(key) ?? (await readShared(key))
  if (kept) return json(kept)

  const ip = request.headers.get("CF-Connecting-IP") ?? "local"
  const db = env.DB as HistoryDb | undefined
  const allowed = db ? await allowQuestion(db, await visitorKey(ip, Date.now()), Date.now(), MAX_PER_WINDOW, WINDOW_MS).catch(() => localLimit.allow(ip)) : localLimit.allow(ip)
  if (!allowed) return json({ ok: false, code: "rate", error: "Too many questions; try again in a few minutes" }, 429)

  try {
    const input = askInput(await readCityFeeds(load, true), centre)
    const facts = askFacts(input)
    // Jev checks answers with a TypeSafe key, or an OpenRouter key as AGENTS.md describes.
    const guard = keys.typesafe ? jevGuard(keys.typesafe) : keys.openrouter ? jevGuard(keys.openrouter, fetch, "openrouter") : null
    const result = await answerQuestion(question, facts, locale, keys, undefined, guard)
    const body: AskBody = {
      ok: true,
      at: new Date().toISOString(),
      answerable: result.answerable,
      answer: result.answer,
      basis: result.basis,
      provider: result.provider,
      checked: result.checked,
      caution: result.caution,
      jev: result.jev,
      barSign: result.answerable ? otherSign(result.answer, input.starts, input.barStartId) : null,
    }
    if (answered.size > 500) answered.clear()
    answered.set(key, body)
    await writeShared(key, body)
    return json(body)
  } catch (error) {
    // The reasons name providers and checks, not keys, so they are safe to return.
    const reason = error instanceof Error ? error.message : "Answer failed"
    // Every answer written was rejected by Jev: the visitor is told to read the map instead.
    const unreliable = reason.split("; ").every((part) => part.includes("Jev found an unsupported claim"))
    return json({ ok: false, code: unreliable ? "unreliable" : "failed", error: reason }, unreliable ? 200 : 502)
  }
}

function readCentre(value: { lng?: unknown; lat?: unknown } | undefined): { lng: number; lat: number } | null {
  const lng = Number(value?.lng)
  const lat = Number(value?.lat)
  // Inside the map's own bounds; anything else is ignored rather than trusted.
  return lng > 113.6 && lng < 114.7 && lat > 21.9 && lat < 22.8 ? { lng, lat } : null
}

function shareKey(key: string): Request {
  return new Request(`https://ask.internal/v1/${encodeURIComponent(key)}`)
}

async function sharedCache(): Promise<Cache | null> {
  const storage = globalThis.caches as (CacheStorage & { default?: Cache }) | undefined
  return storage?.default ?? null
}

async function readShared(key: string): Promise<AskBody | null> {
  try {
    const hit = await (await sharedCache())?.match(shareKey(key))
    return hit ? ((await hit.json()) as AskBody) : null
  } catch {
    return null
  }
}

async function writeShared(key: string, body: AskBody): Promise<void> {
  try {
    await (await sharedCache())?.put(shareKey(key), Response.json(body, { headers: { "Cache-Control": "public, max-age=300" } }))
  } catch {
    // Still answered; a repeat question is just asked again.
  }
}

function json(body: AskBody, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

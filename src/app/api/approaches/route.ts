import { readApproachPoints } from "@/lib/approaches"
import { detailIsDue, failedDetail } from "@/lib/detail-retry"
import { fetchText } from "@/lib/fetch-text"
import { parseJourneyTimes } from "@/lib/journey-times"
import { pool } from "@/lib/pool"
import { fetchUpstream } from "@/lib/upstream"
import type { ApproachesResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

const LOCATIONS_URL =
  "https://www.hkemobility.gov.hk/api/drss/layer/map?service=WFS&version=1.0.0&request=GetFeature&typeName=DRSS:VW_JOURNEY_TIME_LOCATION_EN&outputFormat=application/json&srsName=EPSG:4326"

const LOCATIONS_TC_URL =
  "https://www.hkemobility.gov.hk/api/drss/layer/map?service=WFS&version=1.0.0&request=GetFeature&typeName=DRSS:VW_JOURNEY_TIME_LOCATION_TC&outputFormat=application/json&srsName=EPSG:4326"

const JOURNEY_URL = "https://resource.data.one.gov.hk/td/jss/Journeytimev2.xml"

const FRESH_MS = 60_000
const PLACE_MS = 24 * 60 * 60 * 1000
const DETAIL_LIMIT = 4

let pending: Promise<ApproachesResponse> | null = null
let cached: { at: number; body: ApproachesResponse } | null = null

export async function GET() {
  const now = Date.now()
  if (cached && now - cached.at < FRESH_MS) return Response.json(cached.body)
  pending ??= loadApproaches().finally(() => {
    pending = null
  })
  try {
    const body = await pending
    if (body.ok) cached = { at: Date.now(), body }
    else if (cached) return Response.json(cached.body)
    return Response.json(body, { status: body.ok ? 200 : 502 })
  } catch (error) {
    if (cached) return Response.json(cached.body)
    const body: ApproachesResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Journey time boards failed",
      capturedAt: null,
      points: [],
    }
    return Response.json(body, { status: 502 })
  }
}

let places: { at: number; locations: unknown; traditional: unknown } | null = null

async function loadApproaches(): Promise<ApproachesResponse> {
  const placed = await loadPlaces()
  const minutes = parseJourneyTimes(await fetchText(JOURNEY_URL, FRESH_MS))
  const ids = [...new Set(minutes.map((row) => row.locationId))]
  const details = await loadDetails(ids)
  const { points, capturedAt } = readApproachPoints(placed.locations, details.en, placed.traditional, minutes, details.tc)
  return {
    ok: points.length > 0,
    error: points.length === 0 ? "No journey times were returned." : undefined,
    capturedAt,
    points,
  }
}

const detailCache = new Map<string, { at: number; body: unknown }>()

async function loadDetails(ids: readonly string[]): Promise<{ en: Record<string, unknown>; tc: Record<string, unknown> }> {
  const now = Date.now()
  const jobs = ids.flatMap((id) =>
    (["en", "tc"] as const).flatMap((lang) => (detailIsDue(detailCache.get(detailKey(lang, id)), now, PLACE_MS) ? [{ id, lang }] : [])),
  )
  await pool(jobs, DETAIL_LIMIT, async ({ id, lang }) => {
    const key = detailKey(lang, id)
    try {
      detailCache.set(key, { at: Date.now(), body: await readJson(detailUrl(id, lang), PLACE_MS, 8_000) })
    } catch {
      detailCache.set(key, failedDetail(detailCache.get(key), Date.now(), PLACE_MS))
    }
  })
  const en: Record<string, unknown> = {}
  const tc: Record<string, unknown> = {}
  for (const id of ids) {
    const english = detailCache.get(detailKey("en", id))
    const traditional = detailCache.get(detailKey("tc", id))
    if (english?.body != null) en[id] = english.body
    if (traditional?.body != null) tc[id] = traditional.body
  }
  return { en, tc }
}

async function loadPlaces(): Promise<{ at: number; locations: unknown; traditional: unknown }> {
  const now = Date.now()
  if (places && now - places.at < PLACE_MS) return places
  try {
    const locations = await readJson(LOCATIONS_URL, PLACE_MS, 15_000)
    const traditional = await readJson(LOCATIONS_TC_URL, PLACE_MS, 15_000).catch(() => places?.traditional ?? null)
    places = { at: now, locations, traditional }
    return places
  } catch (error) {
    if (places) return places
    throw error
  }
}

function detailKey(lang: "en" | "tc", id: string): string {
  return `${lang}:${id}`
}

function detailUrl(id: string, lang: "en" | "tc"): string {
  return `https://www.hkemobility.gov.hk/api/drss/getTextInfo/JourneyTime/${lang}/${encodeURIComponent(id)}`
}

async function readJson(url: string, ttlMs = FRESH_MS, timeoutMs = 15_000): Promise<unknown> {
  const response = await fetchUpstream(url, ttlMs, {
    timeoutMs,
    headers: {
      Accept: "application/json",
      Referer: "https://www.hkemobility.gov.hk/en/",
    },
  })
  if (response.status !== 200) throw new Error(`HTTP ${response.status} from hkemobility.gov.hk`)
  return JSON.parse(new TextDecoder().decode(response.body)) as unknown
}

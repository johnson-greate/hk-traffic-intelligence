import { ferryCalls, starSailings } from "@/lib/ferry-clock"
import { etaDue, ETA_FRESH_MS, forgetStale, heldRows, type HeldRows } from "@/lib/place-arrivals"
import { etaQueue } from "@/lib/polite-fetch"
import { pool } from "@/lib/pool"
import { fetchUpstream } from "@/lib/upstream"
import type { FerryCall, FerryResponse, FerryVessel } from "@/lib/types"
import piersFile from "../../data/ferry-piers.json"

type PierRecord = { id: string; nameTc: string; nameEn: string; lng: number; lat: number }
type PierFile = { piers: PierRecord[] }

const piers = (piersFile as PierFile).piers
const FETCH_LIMIT = 4

const SUN_ROUTES: { code: string; from: string; to: string; destTc: string; destEn: string }[] = [
  { code: "CECC", from: "sun-central", to: "sun-cheung-chau", destTc: "長洲", destEn: "Cheung Chau" },
  { code: "CCCE", from: "sun-cheung-chau", to: "sun-central", destTc: "中環", destEn: "Central" },
  { code: "CEMW", from: "sun-central", to: "sun-mui-wo", destTc: "梅窩", destEn: "Mui Wo" },
  { code: "MWCE", from: "sun-mui-wo", to: "sun-central", destTc: "中環", destEn: "Central" },
  { code: "NPHH", from: "sun-north-point", to: "sun-hung-hom", destTc: "紅磡", destEn: "Hung Hom" },
  { code: "HHNP", from: "sun-hung-hom", to: "sun-north-point", destTc: "北角", destEn: "North Point" },
  { code: "NPKC", from: "sun-north-point", to: "sun-kowloon-city", destTc: "九龍城", destEn: "Kowloon City" },
  { code: "KCNP", from: "sun-kowloon-city", to: "sun-north-point", destTc: "北角", destEn: "North Point" },
]

const HKKF_ROUTES: { id: number; from: string; to: string; fromTc: string; fromEn: string; toTc: string; toEn: string }[] = [
  { id: 1, from: "hkkf-central", to: "hkkf-sok-kwu-wan", fromTc: "中環", fromEn: "Central", toTc: "索罟灣", toEn: "Sok Kwu Wan" },
  { id: 2, from: "hkkf-central", to: "hkkf-yung-shue-wan", fromTc: "中環", fromEn: "Central", toTc: "榕樹灣", toEn: "Yung Shue Wan" },
  { id: 3, from: "hkkf-central-6", to: "hkkf-peng-chau", fromTc: "中環", fromEn: "Central", toTc: "坪洲", toEn: "Peng Chau" },
  { id: 4, from: "hkkf-peng-chau", to: "hkkf-hei-ling-chau", fromTc: "坪洲", fromEn: "Peng Chau", toTc: "喜靈洲", toEn: "Hei Ling Chau" },
]

const STAR_SHEETS = [
  { url: "https://www.starferry.com.hk/sites/default/files/upload/open_data/csv/ferry_sf_central_tsimshatsui_timetable_eng.csv", from: "star-central", to: "star-tst" },
  { url: "https://www.starferry.com.hk/sites/default/files/upload/open_data/csv/ferry_sf_wanchai_tsimshatsui_timetable_eng.csv", from: "star-wanchai", to: "star-tst" },
]

type Clock = { route: string; destTc: string; destEn: string; eta: string; pierId: string; remarkTc: string; remarkEn: string }
type SunFix = { vessel: FerryVessel | null; clocks: Clock[] }

const clocks = new Map<string, HeldRows<Clock>>()
const vessels = new Map<string, HeldRows<FerryVessel | null>>()
let starText: { at: number; sheets: { from: string; csv: string }[] } | null = null

export async function loadFerrySnapshot(now = Date.now()): Promise<FerryResponse> {
  forgetStale(clocks, now)
  forgetStale(vessels, now)
  const jobs = [
    ...SUN_ROUTES.map((route) => ({ key: `sun:${route.code}`, run: () => fetchSun(route) })),
    ...HKKF_ROUTES.flatMap((route) => (["inbound", "outbound"] as const).map((direction) => ({
      key: `hkkf:${route.id}:${direction}`,
      run: () => fetchHkkf(route, direction),
    }))),
  ]
  const due = jobs.filter((job) => etaDue(clocks.get(job.key), now))
  await pool(due, FETCH_LIMIT, async (job) => {
    const result = await job.run()
    if (!result) return
    clocks.set(job.key, { at: now, rows: result.clocks })
    if (job.key.startsWith("sun:")) vessels.set(job.key, { at: now, rows: result.vessel ? [result.vessel] : [] })
  })
  await rememberStar(now)

  const byPier = new Map<string, FerryCall[]>()
  for (const item of clocks.values()) {
    const rows = heldRows(item, now) ?? []
    for (const row of rows) {
      const timed = row.eta ? ferryCalls([row], now)[0] : null
      const call = timed ?? (row.remarkTc || row.remarkEn
        ? { route: row.route, destTc: row.destTc, destEn: row.destEn, eta: "", minutes: null, remarkTc: row.remarkTc, remarkEn: row.remarkEn }
        : null)
      if (!call) continue
      const list = byPier.get(row.pierId) ?? []
      list.push(call)
      byPier.set(row.pierId, list)
    }
  }
  const boards = piers.map((pier) => ({
    id: pier.id,
    nameTc: pier.nameTc,
    nameEn: pier.nameEn,
    lng: pier.lng,
    lat: pier.lat,
    calls: (byPier.get(pier.id) ?? []).sort((a, b) => (a.minutes ?? 999) - (b.minutes ?? 999)).slice(0, 6),
  }))
  const moving: FerryVessel[] = []
  for (const item of vessels.values()) {
    for (const vessel of heldRows(item, now) ?? []) {
      if (vessel) moving.push(vessel)
    }
  }
  return { ok: true, observedAt: new Date(now).toISOString(), piers: boards, vessels: moving }
}

async function fetchSun(route: (typeof SUN_ROUTES)[number]): Promise<SunFix | null> {
  try {
    const response = await etaQueue(() => fetchUpstream(`https://www.sunferry.com.hk/eta/?route=${encodeURIComponent(route.code)}`, ETA_FRESH_MS, {
      timeoutMs: 8_000,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://hktraffic.keith-li.workers.dev)" },
    }))
    if (response.status !== 200) return null
    const body = JSON.parse(new TextDecoder().decode(response.body)) as { data?: Record<string, unknown>[] }
    const row = body.data?.[0]
    if (!row) return { vessel: null, clocks: [] }
    const depart = text(row.depart_time)
    const arrive = text(row.eta)
    const next: Clock[] = []
    if (depart) next.push({ route: route.code, destTc: route.destTc, destEn: route.destEn, eta: depart, pierId: route.from, remarkTc: "", remarkEn: "" })
    if (arrive) next.push({ route: route.code, destTc: route.destTc, destEn: route.destEn, eta: arrive, pierId: route.to, remarkTc: "", remarkEn: "" })
    const lng = Number(row.lng)
    const lat = Number(row.lat)
    const vessel = Number.isFinite(lng) && Number.isFinite(lat) && lat > 22 && lat < 23 && lng > 113 && lng < 115
      ? { id: `${route.code}-${text(row.vesselcode) || "boat"}`, nameTc: text(row.route_tc), nameEn: text(row.route_en), lng, lat, route: route.code, eta: arrive || depart }
      : null
    return { vessel, clocks: next }
  } catch {
    return null
  }
}

async function fetchHkkf(route: (typeof HKKF_ROUTES)[number], direction: "inbound" | "outbound"): Promise<SunFix | null> {
  try {
    const response = await etaQueue(() => fetchUpstream(`https://www.hkkfeta.com/opendata/eta/${route.id}/${direction}`, ETA_FRESH_MS, {
      timeoutMs: 8_000,
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://hktraffic.keith-li.workers.dev)" },
    }))
    if (response.status !== 200) return null
    const body = JSON.parse(new TextDecoder().decode(response.body)) as { data?: Record<string, unknown>[] }
    const row = body.data?.[0]
    if (!row) return { vessel: null, clocks: [] }
    const depart = text(row.session_time)
    const arrive = text(row.ETA)
    const towardsDest = direction === "outbound"
    const next: Clock[] = []
    if (depart) {
      next.push({
        route: String(route.id),
        destTc: towardsDest ? route.toTc : route.fromTc,
        destEn: towardsDest ? route.toEn : route.fromEn,
        eta: depart,
        pierId: towardsDest ? route.from : route.to,
        remarkTc: "",
        remarkEn: "",
      })
    }
    if (arrive) {
      next.push({
        route: String(route.id),
        destTc: towardsDest ? route.toTc : route.fromTc,
        destEn: towardsDest ? route.toEn : route.fromEn,
        eta: arrive,
        pierId: towardsDest ? route.to : route.from,
        remarkTc: "",
        remarkEn: "",
      })
    }
    return { vessel: null, clocks: next }
  } catch {
    return null
  }
}

async function rememberStar(now: number): Promise<void> {
  if (!starText || now - starText.at > 24 * 60 * 60 * 1000) {
    const sheets: { from: string; csv: string }[] = []
    for (const sheet of STAR_SHEETS) {
      try {
        const response = await fetchUpstream(sheet.url, 24 * 60 * 60 * 1000, { timeoutMs: 15_000, headers: { Accept: "text/csv" } })
        if (response.status !== 200) continue
        sheets.push({ from: sheet.from, csv: new TextDecoder().decode(response.body) })
      } catch {
        // The previous day's table stays in starText when a sheet fails.
      }
    }
    if (sheets.length > 0) starText = { at: now, sheets }
  }
  if (!starText) return
  const rows = starSailings(starText.sheets, now)
  clocks.set("star", { at: now, rows })
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

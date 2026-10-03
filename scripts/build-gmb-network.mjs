// Builds data/gmb-network.json from the Transport Department green minibus feed.
// Stop positions are WGS84. The HK80 pair on the same record is a grid and is ignored.
// The walk is resumable: progress is kept in /tmp/gmb-checkpoint.json, and a refused
// call waits before it is tried again. One request at a time, with a gap between them.
// Run: node scripts/build-gmb-network.mjs

import { writeSync } from "node:fs"
import { readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = "https://data.etagmb.gov.hk"
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://hktraffic.keith-li.workers.dev)",
}
const REGIONS = ["HKI", "KLN", "NT"]
const GAP_MS = 900
const CHECKPOINT = "/tmp/gmb-checkpoint.json"
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "../data/gmb-network.json")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(message) {
  writeSync(1, `${message}\n`)
}

let strikes = 0

async function load(path) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (attempt === 0) await sleep(GAP_MS)
    else await sleep(Math.min(90_000, 20_000 * attempt))
    let response
    try {
      response = await fetch(`${ROOT}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(12_000) })
    } catch (error) {
      log(`retry ${path} ${error instanceof Error ? error.message : error}`)
      continue
    }
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      strikes += 1
      log(`backoff ${response.status} ${path} (strike ${strikes})`)
      if (strikes >= 2) {
        log("cooling down 120s")
        await sleep(120_000)
        strikes = 0
      }
      continue
    }
    strikes = 0
    if (!response.ok) throw new Error(`${path} ${response.status}`)
    return response.json()
  }
  throw new Error(`${path} gave up`)
}

function blankStop(tc = "", en = "") {
  return { tc, en, routes: new Set(), ids: {}, lng: null, lat: null }
}

function rememberStop(stops, id, patch) {
  const current = stops.get(id) ?? blankStop()
  if (patch.tc) current.tc = patch.tc
  if (patch.en) current.en = patch.en
  for (const route of patch.routes ?? []) current.routes.add(route)
  Object.assign(current.ids, patch.ids ?? {})
  if (Number.isFinite(patch.lng) && Number.isFinite(patch.lat)) {
    current.lng = patch.lng
    current.lat = patch.lat
  }
  stops.set(id, current)
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch {
    return null
  }
}

const stops = new Map()
const done = new Set()
const failed = new Set()
const checkpoint = await readJson(CHECKPOINT)
if (checkpoint?.stops) {
  for (const [id, stop] of Object.entries(checkpoint.stops)) {
    rememberStop(stops, id, { ...stop, routes: stop.routes ?? [] })
  }
  for (const code of checkpoint.done ?? []) done.add(code)
  for (const code of checkpoint.failed ?? []) failed.add(code)
  log(`resume ${done.size} routes, ${stops.size} stops`)
}

const published = await readJson(OUTPUT)
for (const [id, stop] of Object.entries(published?.stops ?? {})) {
  rememberStop(stops, id, stop)
}

async function save() {
  const body = {
    done: [...done],
    failed: [...failed],
    stops: {},
  }
  const publishedStops = {}
  for (const [id, stop] of stops) {
    body.stops[id] = {
      tc: stop.tc,
      en: stop.en,
      routes: [...stop.routes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
      ids: stop.ids,
      lng: stop.lng,
      lat: stop.lat,
    }
    if (!Number.isFinite(stop.lng) || !Number.isFinite(stop.lat)) continue
    publishedStops[id] = {
      tc: stop.tc,
      en: stop.en,
      lng: stop.lng,
      lat: stop.lat,
      routes: body.stops[id].routes,
      ids: stop.ids,
    }
  }
  const temporary = `${OUTPUT}.next`
  await writeFile(temporary, JSON.stringify({ stops: publishedStops }))
  await rename(temporary, OUTPUT)
  await writeFile(CHECKPOINT, JSON.stringify(body))
  return Object.keys(publishedStops).length
}

const jobs = []
for (const region of REGIONS) {
  const listed = await load(`/route/${region}`)
  for (const code of listed.data?.routes ?? []) jobs.push({ region, code: String(code) })
}
log(`${jobs.length} route codes, ${done.size} already stored`)

let walked = 0
for (const job of jobs) {
  const key = `${job.region}/${job.code}`
  if (done.has(key)) continue
  let detail
  try {
    detail = await load(`/route/${encodeURIComponent(job.region)}/${encodeURIComponent(job.code)}`)
  } catch (error) {
    failed.add(key)
    log(`skip ${key} ${error instanceof Error ? error.message : error}`)
    continue
  }
  for (const variant of detail.data ?? []) {
    const routeCode = String(variant.route_code ?? job.code).trim()
    const routeId = variant.route_id
    if (!routeCode || routeId == null) continue
    for (const direction of variant.directions ?? []) {
      let board
      try {
        board = await load(`/route-stop/${routeId}/${direction.route_seq}`)
      } catch (error) {
        log(`skip stops ${routeId}/${direction.route_seq} ${error instanceof Error ? error.message : error}`)
        continue
      }
      for (const stop of board.data?.route_stops ?? []) {
        const id = String(stop.stop_id ?? "")
        if (!id) continue
        rememberStop(stops, id, {
          tc: String(stop.name_tc ?? "").trim(),
          en: String(stop.name_en ?? "").trim(),
          routes: [routeCode],
          ids: { [String(routeId)]: routeCode },
        })
      }
    }
  }
  done.add(key)
  failed.delete(key)
  walked += 1
  if (walked % 4 === 0) await placeSome(12)
  if (walked % 4 === 0) {
    const placed = await save()
    log(`${done.size}/${jobs.length} routes, ${stops.size} stops, ${placed} placed`)
  }
}

async function placeSome(limit) {
  const missing = []
  for (const [id, stop] of stops) {
    if (Number.isFinite(stop.lng) && Number.isFinite(stop.lat)) continue
    missing.push(id)
    if (missing.length >= limit) break
  }
  for (const id of missing) await placeOne(id)
}

async function placeOne(id) {
  try {
    const body = await load(`/stop/${encodeURIComponent(id)}`)
    const point = body.data?.coordinates?.wgs84
    const lng = Number(point?.longitude)
    const lat = Number(point?.latitude)
    if (body.data?.enabled === false || !Number.isFinite(lng) || !Number.isFinite(lat)) {
      stops.delete(id)
      return
    }
    const record = stops.get(id)
    record.lng = lng
    record.lat = lat
  } catch (error) {
    log(`keep ${id} without a position ${error instanceof Error ? error.message : error}`)
  }
}

const missing = [...stops.keys()].filter((id) => {
  const stop = stops.get(id)
  return !Number.isFinite(stop.lng) || !Number.isFinite(stop.lat)
})
log(`coordinates for ${missing.length} stops`)
let placedCount = 0
for (const id of missing) {
  await placeOne(id)
  placedCount += 1
  if (placedCount % 40 === 0) {
    const placed = await save()
    log(`${placedCount}/${missing.length} coordinates, ${placed} placed`)
  }
}

const placed = await save()
log(`${placed} stops written`)

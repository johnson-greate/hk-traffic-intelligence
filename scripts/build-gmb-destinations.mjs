// Reads the published green minibus route list and keeps each direction's destination.
// One request at a time. Run: node scripts/build-gmb-destinations.mjs

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
const GAP_MS = 3_000
const COOL_MS = 180_000
const CHECKPOINT = "/tmp/gmb-destinations-checkpoint.json"
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "../data/gmb-destinations.json")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function log(message) {
  writeSync(1, `${message}\n`)
}

async function load(path) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(attempt === 0 ? GAP_MS : COOL_MS)
    let response
    try {
      response = await fetch(`${ROOT}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(12_000) })
    } catch (error) {
      log(`retry ${path} ${error instanceof Error ? error.message : error}`)
      continue
    }
    if (response.status === 403 || response.status === 429 || response.status >= 500) {
      log(`refused ${response.status} ${path}, resting ${COOL_MS / 1000}s`)
      continue
    }
    if (!response.ok) throw new Error(`${path} ${response.status}`)
    return response.json()
  }
  throw new Error(`${path} gave up`)
}

function text(value) {
  return typeof value === "string" ? value.trim() : ""
}

const saved = JSON.parse(await readFile(CHECKPOINT, "utf8").catch(() => "null"))
const routes = saved?.routes ?? {}
const done = new Set(saved?.done ?? [])
if (done.size > 0) {
  log(`resting ${COOL_MS / 1000}s. ${done.size} routes are already stored`)
  await sleep(COOL_MS)
}

async function save() {
  const body = { routes }
  const temporary = `${OUTPUT}.next`
  await writeFile(temporary, JSON.stringify(body))
  await rename(temporary, OUTPUT)
  await writeFile(CHECKPOINT, JSON.stringify({ done: [...done], routes }))
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
    log(`skip ${key} ${error instanceof Error ? error.message : error}`)
    continue
  }
  for (const variant of detail.data ?? []) {
    const routeId = variant.route_id
    if (routeId == null) continue
    const directions = {}
    for (const direction of variant.directions ?? []) {
      const seq = direction.route_seq
      const tc = text(direction.dest_tc)
      const en = text(direction.dest_en)
      if (seq == null || (!tc && !en)) continue
      directions[String(seq)] = { tc, en }
    }
    if (Object.keys(directions).length > 0) routes[String(routeId)] = directions
  }
  done.add(key)
  walked += 1
  if (walked % 25 === 0) {
    await save()
    log(`${done.size}/${jobs.length} routes, ${Object.keys(routes).length} ids`)
  }
}

await save()
log(`${done.size}/${jobs.length} routes, ${Object.keys(routes).length} ids written`)

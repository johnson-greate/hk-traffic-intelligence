// Builds data/kmb-network.json from the public KMB stop list.
// A stop has a name and a coordinate. The feed does not include the road a bus takes.
// Run: node scripts/build-kmb-network.mjs

import { writeFile } from "node:fs/promises"

const ROOT = "https://data.etabus.gov.hk/v1/transport/kmb"
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://traffic.resource.hk)",
}

async function load(path) {
  const response = await fetch(`${ROOT}/${path}`, { headers: HEADERS })
  if (!response.ok) throw new Error(`${path} ${response.status}`)
  const body = await response.json()
  if (!Array.isArray(body.data)) throw new Error(`${path} has no data`)
  return body.data
}

const stopRows = await load("stop")

const stops = {}
for (const row of stopRows) {
  const lng = Number(row.long)
  const lat = Number(row.lat)
  if (!row.stop || !Number.isFinite(lng) || !Number.isFinite(lat)) continue
  stops[row.stop] = {
    tc: String(row.name_tc ?? "").trim(),
    en: String(row.name_en ?? "").trim(),
    lng,
    lat,
  }
}

const file = { stops }
const target = new URL("../data/kmb-network.json", import.meta.url)
await writeFile(target, JSON.stringify(file))
console.log(`${Object.keys(stops).length} stops`)

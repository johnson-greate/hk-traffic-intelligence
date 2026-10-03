// Builds data/nlb-network.json from the New Lantao Bus route and stop lists.
// Run: node scripts/build-nlb-network.mjs

import { writeFile } from "node:fs/promises"

const ROOT = "https://rt.data.gov.hk/v2/transport/nlb"
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://hktraffic.keith-li.workers.dev)",
}

async function load(path) {
  const response = await fetch(`${ROOT}${path}`, { headers: HEADERS })
  if (!response.ok) throw new Error(`${path} ${response.status}`)
  return response.json()
}

const listed = await load("/route.php?action=list")
const stops = new Map()
for (const route of listed.routes ?? []) {
  const routeId = String(route.routeId ?? "")
  const code = String(route.routeNo ?? "").trim()
  if (!routeId || !code) continue
  const board = await load(`/stop.php?action=list&routeId=${encodeURIComponent(routeId)}`)
  for (const stop of board.stops ?? []) {
    const id = String(stop.stopId ?? "")
    const lng = Number(stop.longitude)
    const lat = Number(stop.latitude)
    if (!id || !Number.isFinite(lng) || !Number.isFinite(lat)) continue
    const current = stops.get(id) ?? {
      tc: String(stop.stopName_c ?? "").trim(),
      en: String(stop.stopName_e ?? "").trim(),
      lng,
      lat,
      routes: [],
      services: [],
    }
    if (!current.routes.includes(code)) current.routes.push(code)
    if (!current.services.some((service) => service.id === routeId)) current.services.push({ id: routeId, code })
    stops.set(id, current)
  }
  await new Promise((resolve) => setTimeout(resolve, 80))
}

const file = { stops: {} }
for (const [id, stop] of stops) {
  stop.routes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  file.stops[id] = stop
}
await writeFile(new URL("../data/nlb-network.json", import.meta.url), JSON.stringify(file))
console.log(`${listed.routes?.length ?? 0} routes, ${Object.keys(file.stops).length} stops`)

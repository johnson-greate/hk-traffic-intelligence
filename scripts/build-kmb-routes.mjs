// Builds data/kmb-routes.json from the public KMB route-stop list.
// A stop keeps the route numbers that call there. Arrival times are not in this file.
// Run: node scripts/build-kmb-routes.mjs

import { writeFile } from "node:fs/promises"

const ROOT = "https://data.etabus.gov.hk/v1/transport/kmb/route-stop"
const response = await fetch(ROOT, {
  headers: {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; HKTrafficIntelligence/1.0; +https://hktraffic.keith-li.workers.dev)",
  },
})
if (!response.ok) throw new Error(`route-stop ${response.status}`)
const body = await response.json()
if (!Array.isArray(body.data)) throw new Error("route-stop has no data")

const grouped = new Map()
for (const row of body.data) {
  const stop = typeof row.stop === "string" ? row.stop.trim() : ""
  const route = typeof row.route === "string" ? row.route.trim() : ""
  if (!stop || !route) continue
  const routes = grouped.get(stop) ?? new Set()
  routes.add(route)
  grouped.set(stop, routes)
}

const stops = {}
for (const [stop, routes] of grouped) {
  stops[stop] = [...routes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

const target = new URL("../data/kmb-routes.json", import.meta.url)
await writeFile(target, JSON.stringify({ stops }))
console.log(`${Object.keys(stops).length} stops`)

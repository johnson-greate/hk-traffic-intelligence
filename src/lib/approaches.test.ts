import assert from "node:assert/strict"
import { readApproachPoints } from "./approaches.ts"
import type { JourneyMinute } from "./journey-times.ts"

const HARBOUR = ["CH", "EH", "WH"]

function board(id: string, name: string) {
  return {
    type: "Feature",
    properties: { LOCATION_ID: id, LOCATION: name },
    geometry: { type: "Point", coordinates: [114.152549, 22.327028] },
  }
}

const wfs = {
  features: [
    board("K07", "West Kowloon Highway westbound near MTR Nam Cheong Station"),
    board("H2", "Canal Road Flyover northbound"),
    board("H1", "Gloucester Road eastbound"),
    board("H6", "Wong Nai Chung Gap Road"),
  ],
}

const { points } = readApproachPoints(wfs, {
  K07: [
    { dest: { did: "ACTT", desc: "Airport via<br>Route 3", date: "2026-10-03T14:21:00", time: 21, cid: 3 } },
    { dest: { did: "ATSCA", desc: "Airport via<br>Route 8", date: "2026-10-03T14:21:00", time: 22, cid: 3 } },
  ],
  H2: [
    { dest: { did: "CH", desc: "Cross Harbour Tunnel", date: "2026-10-03T14:21:00", time: 7, cid: 3 } },
    { dest: { did: "WH", desc: "Western Harbour Crossing", date: "2026-10-03T14:21:00", time: null, cid: 0 } },
  ],
  H1: [{ dest: { did: "EH", desc: "Eastern Harbour Crossing", date: "2026-10-03T14:21:00", time: -1, cid: 1 } }],
  H6: [
    { dest: { did: "ABT", desc: "Wan Chai via<br>Aberdeen Tunnel", date: "2026-10-03T14:21:00", time: 9, cid: 3 } },
    { dest: { did: "WNCG", desc: "Wan Chai via<br>Wong Nai Chung Gap Road", date: "2026-10-03T14:21:00", time: 10, cid: 3 } },
  ],
})

assert.deepEqual(points.map((point) => point.id), ["H2", "H6", "K07"])
assert.deepEqual(points[0]?.legs.map((leg) => leg.code), ["CH"])
assert.equal(points[0]?.legs[0]?.minutes, 7)
assert.deepEqual(points.find((point) => point.id === "H6")?.legs.map((leg) => leg.name), [
  "Wan Chai via Aberdeen Tunnel",
  "Wan Chai via Wong Nai Chung Gap Road",
])
assert.deepEqual(
  points.find((point) => point.id === "H6")?.legs.map((leg) => leg.code).filter((code) => HARBOUR.includes(code)),
  [],
)

const minutes: JourneyMinute[] = [
  { locationId: "H2", destinationId: "CH", minutes: 12, colour: "amber", capturedAt: "2026-10-09T21:58:00" },
  { locationId: "H6", destinationId: "ABT", minutes: 8, colour: "green", capturedAt: "2026-10-09T21:59:00" },
]
const joined = readApproachPoints(wfs, {
  H6: [{ dest: { did: "ABT", desc: "Wan Chai via<br>Aberdeen Tunnel" } }],
}, null, minutes)
assert.deepEqual(joined.points.map((point) => point.id), ["H2", "H6"])
assert.equal(joined.points.find((point) => point.id === "H2")?.legs[0]?.minutes, 12)
assert.equal(joined.points.find((point) => point.id === "H6")?.legs[0]?.name, "Wan Chai via Aberdeen Tunnel")
assert.equal(joined.capturedAt, "2026-10-09T21:59:00")
assert.deepEqual(
  joined.points.find((point) => point.id === "H6")?.legs.map((leg) => leg.code).filter((code) => HARBOUR.includes(code)),
  [],
)
assert.deepEqual(
  joined.points.find((point) => point.id === "H2")?.legs.map((leg) => leg.code).filter((code) => HARBOUR.includes(code)),
  ["CH"],
)

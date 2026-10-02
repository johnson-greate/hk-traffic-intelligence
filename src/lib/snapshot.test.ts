import assert from "node:assert/strict"
import { buildSnapshot, observedEpoch } from "./snapshot.ts"
import type { ApproachesResponse, TrafficResponse } from "./types.ts"

// Transport Department times are Hong Kong local time.
assert.equal(observedEpoch("2026-10-02 19:35:00"), Date.UTC(2026, 9, 2, 11, 35))
assert.equal(observedEpoch("2026-10-02T19:35:00"), Date.UTC(2026, 9, 2, 11, 35))
assert.equal(observedEpoch("not a time"), null)
assert.equal(observedEpoch(null), null)

const corridor = (id: string, speedKmh: number | null) => ({
  id,
  roadTc: id,
  roadEn: id,
  direction: "",
  speedKmh,
  band: "free" as const,
  lengthKm: 1,
  detectorCount: 0,
  coordinates: [] as [number, number][],
})

const traffic = {
  ok: true,
  observedAt: "2026-10-02 19:35:00",
  corridors: [corridor("1", 61.6), corridor("2", null), corridor("3", 4.2)],
  summary: { corridorCount: 3, detectorCount: 0, meanSpeedKmh: 60.4162, free: 2, slow: 0, congested: 1, unknown: 0 },
} as unknown as TrafficResponse

const approaches = {
  ok: true,
  capturedAt: "2026-10-02T19:35:00",
  points: [
    {
      id: "H11",
      name: "",
      nameTc: "",
      coordinates: [0, 0],
      legs: [
        { code: "CH", name: "", minutes: 25, colour: "amber" },
        { code: "EH", name: "", minutes: null, colour: "none" },
        { code: "TKO", name: "", minutes: 3, colour: "green" },
      ],
    },
  ],
} as ApproachesResponse

const snap = buildSnapshot(traffic, approaches)
assert.ok(snap)
assert.equal(snap.ts, Date.UTC(2026, 9, 2, 11, 35))
assert.equal(snap.observedAt, "2026-10-02 19:35:00")
assert.equal(snap.meanSpeed, 60.4)
assert.deepEqual([snap.free, snap.slow, snap.congested, snap.unknown], [2, 0, 1, 0])
// Only harbour tunnels with a published time.
assert.deepEqual(snap.crossings, [{ origin: "H11", code: "CH", minutes: 25 }])
// Whole km/h, roads without a reading left out.
assert.deepEqual(snap.speeds, { "1": 62, "3": 4 })

// Crossing times are optional; road speeds are not.
assert.deepEqual(buildSnapshot(traffic, null)?.crossings, [])
assert.equal(buildSnapshot({ ...traffic, ok: false }, approaches), null)
assert.equal(buildSnapshot({ ...traffic, observedAt: null }, approaches), null)

console.log("snapshot ok")

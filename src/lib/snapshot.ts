import type { ApproachesResponse, TrafficResponse } from "./types.ts"

const HARBOUR = new Set(["CH", "EH", "WH"])

export type CrossingTime = { origin: string; code: string; minutes: number }

// One five-minute picture of the city, small enough to keep one row per reading.
export type Snapshot = {
  ts: number
  observedAt: string
  meanSpeed: number | null
  free: number
  slow: number
  congested: number
  unknown: number
  crossings: CrossingTime[]
  // Corridor id to whole km/h.
  speeds: Record<string, number>
}

// Transport Department readings carry Hong Kong local time with no offset.
export function observedEpoch(observedAt: string | null): number | null {
  if (!observedAt) return null
  const ms = Date.parse(`${observedAt.replace(" ", "T")}+08:00`)
  return Number.isNaN(ms) ? null : ms
}

export function buildSnapshot(traffic: TrafficResponse, approaches: ApproachesResponse | null): Snapshot | null {
  const ts = observedEpoch(traffic.observedAt)
  if (!traffic.ok || ts == null || !traffic.observedAt) return null
  const speeds: Record<string, number> = {}
  for (const corridor of traffic.corridors) {
    if (corridor.speedKmh != null) speeds[corridor.id] = Math.round(corridor.speedKmh)
  }
  const crossings = (approaches?.ok ? approaches.points : []).flatMap((point) =>
    point.legs.flatMap((leg) => (HARBOUR.has(leg.code) && leg.minutes != null ? [{ origin: point.id, code: leg.code, minutes: leg.minutes }] : [])),
  )
  const { summary } = traffic
  return {
    ts,
    observedAt: traffic.observedAt,
    meanSpeed: summary.meanSpeedKmh == null ? null : Math.round(summary.meanSpeedKmh * 10) / 10,
    free: summary.free,
    slow: summary.slow,
    congested: summary.congested,
    unknown: summary.unknown,
    crossings,
    speeds,
  }
}

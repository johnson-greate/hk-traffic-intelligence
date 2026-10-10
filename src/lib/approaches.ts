import { standardHan } from "./camera-place.ts"
import type { JourneyMinute } from "./journey-times.ts"
import type { ApproachLeg, ApproachPoint, HarbourJourney } from "@/lib/types"

const CROSSING_ORDER = ["CH", "EH", "WH"] as const

const CROSSING_NAMES: Record<(typeof CROSSING_ORDER)[number], string> = {
  CH: "Cross Harbour Tunnel",
  EH: "Eastern Harbour Crossing",
  WH: "Western Harbour Crossing",
}

export function readApproachPoints(
  wfs: unknown,
  detailsById: Readonly<Record<string, unknown>>,
  traditionalWfs: unknown = null,
  minutes: readonly JourneyMinute[] | null = null,
  traditionalDetails: Readonly<Record<string, unknown>> | null = null,
): { points: ApproachPoint[]; capturedAt: string | null } {
  const traditional = locationNames(traditionalWfs)
  const byLocation = minutesByLocation(minutes)
  const points: ApproachPoint[] = []
  let capturedAt: string | null = null

  for (const feature of featuresOf(wfs)) {
    const id = text(feature.properties?.LOCATION_ID)
    if (!id) continue
    const coordinates = pointOf(feature.geometry)
    if (!coordinates) continue
    const detail = detailsById[id]
    const published = byLocation?.get(id)
    const traditionalDetail = traditionalDetails?.[id]
    const legs = (published ? legsFromMinutes(published, detail, traditionalDetail) : legsOf(detail, traditionalDetail)).filter((leg) => leg.minutes != null)
    if (legs.length === 0) continue
    const dated = published ? latestCapture(published) : firstDate(detail)
    if (dated && (!capturedAt || dated > capturedAt)) capturedAt = dated
    const named = text(feature.properties?.LOCATION) || textFromDetail(detail)
    points.push({
      id,
      name: named || id,
      nameTc: standardHan(traditional.get(id) ?? ""),
      coordinates,
      legs,
    })
  }

  points.sort((a, b) => a.id.localeCompare(b.id, "en"))
  return { points, capturedAt }
}

function locationNames(wfs: unknown): Map<string, string> {
  const names = new Map<string, string>()
  for (const feature of featuresOf(wfs)) {
    const id = text(feature.properties?.LOCATION_ID)
    const name = text(feature.properties?.LOCATION)
    if (id && name) names.set(id, name)
  }
  return names
}

function featuresOf(wfs: unknown): Feature[] {
  if (!isRecord(wfs) || !Array.isArray(wfs.features)) return []
  return wfs.features.flatMap((feature) => (isFeature(feature) ? [feature] : []))
}

function minutesByLocation(minutes: readonly JourneyMinute[] | null): Map<string, JourneyMinute[]> | null {
  if (!minutes) return null
  const grouped = new Map<string, JourneyMinute[]>()
  for (const row of minutes) {
    const list = grouped.get(row.locationId) ?? []
    list.push(row)
    grouped.set(row.locationId, list)
  }
  return grouped
}

function legsFromMinutes(rows: readonly JourneyMinute[], detail: unknown, traditional: unknown): ApproachLeg[] {
  const byCode = new Map<string, ApproachLeg>()
  for (const row of rows) {
    if (byCode.has(row.destinationId)) continue
    byCode.set(row.destinationId, {
      code: row.destinationId,
      name: destinationSentence(detail, row.destinationId) || crossingName(row.destinationId),
      nameTc: traditionalName(traditional, row.destinationId),
      minutes: row.minutes,
      colour: row.colour,
    })
  }
  return ordered(byCode)
}

function legsOf(detail: unknown, traditional: unknown): ApproachLeg[] {
  if (!Array.isArray(detail)) return []
  const byCode = new Map<string, ApproachLeg>()
  for (const row of detail) {
    if (!isRecord(row) || !isRecord(row.dest)) continue
    const code = text(row.dest.did)
    if (!code || byCode.has(code)) continue
    byCode.set(code, {
      code,
      name: plain(text(row.dest.desc)) || crossingName(code),
      nameTc: traditionalName(traditional, code),
      minutes: minutesOf(row.dest.time),
      colour: colourOf(row.dest.cid),
    })
  }
  return ordered(byCode)
}

function ordered(byCode: Map<string, ApproachLeg>): ApproachLeg[] {
  const harbour = CROSSING_ORDER.flatMap((code) => {
    const leg = byCode.get(code)
    return leg ? [leg] : []
  })
  const rest = [...byCode.keys()]
    .filter((code) => !isCrossing(code))
    .sort((a, b) => a.localeCompare(b, "en"))
    .flatMap((code) => {
      const leg = byCode.get(code)
      return leg ? [leg] : []
    })
  return [...harbour, ...rest]
}

function latestCapture(rows: readonly JourneyMinute[]): string | null {
  let latest = ""
  for (const row of rows) {
    if (row.capturedAt > latest) latest = row.capturedAt
  }
  return latest || null
}

function traditionalName(detail: unknown, code: string): string {
  const name = destinationSentence(detail, code)
  return name ? standardHan(name) : ""
}

function destinationSentence(detail: unknown, code: string): string {
  if (!Array.isArray(detail)) return ""
  for (const row of detail) {
    if (!isRecord(row) || !isRecord(row.dest)) continue
    if (text(row.dest.did) !== code) continue
    const name = plain(text(row.dest.desc))
    if (name) return name
  }
  return ""
}

function firstDate(detail: unknown): string | null {
  if (!Array.isArray(detail)) return null
  for (const row of detail) {
    if (!isRecord(row) || !isRecord(row.dest)) continue
    const date = text(row.dest.date)
    if (date) return date
  }
  return null
}

function textFromDetail(detail: unknown): string {
  if (!Array.isArray(detail)) return ""
  for (const row of detail) {
    if (isRecord(row)) {
      const desc = text(row.desc)
      if (desc) return desc
    }
  }
  return ""
}

function pointOf(geometry: Feature["geometry"]): [number, number] | null {
  if (!geometry || geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) return null
  const [lng, lat] = geometry.coordinates
  if (typeof lng !== "number" || typeof lat !== "number") return null
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
  return [lng, lat]
}

function minutesOf(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
  return value
}

function colourOf(cid: unknown): HarbourJourney["colour"] {
  switch (cid) {
    case 1:
    case "1":
      return "red"
    case 2:
    case "2":
      return "amber"
    case 3:
    case "3":
      return "green"
    default:
      return "none"
  }
}

function isCrossing(code: string): code is (typeof CROSSING_ORDER)[number] {
  return code === "CH" || code === "EH" || code === "WH"
}

function crossingName(code: string): string {
  if (isCrossing(code)) return CROSSING_NAMES[code]
  return code
}

function plain(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/[\s\u3000]+/g, " ")
    .trim()
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

type Feature = {
  properties?: { LOCATION_ID?: unknown; LOCATION?: unknown }
  geometry?: { type?: unknown; coordinates?: unknown[] } | null
}

function isFeature(value: unknown): value is Feature {
  return isRecord(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

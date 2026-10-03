import { ferryInstant } from "@/lib/ferry-clock"
import { metresBetween, type GeoPoint } from "@/lib/mtr-estimate"
import type { FerryVessel } from "@/lib/types"

// These boats do not publish a position. The minutes are walked along the
// pier-to-pier run, the same way a train is placed from its countdown.
// Underway speed is about 12 knots. A sea crossing is not an eight-minute rail hop.
const FERRY_MPS = 6

export type FerryTrack = {
  route: string
  fromId: string
  toId: string
  fromTc: string
  fromEn: string
  toTc: string
  toEn: string
  destTc: string
}

export type FerryMark = {
  route: string
  pierId: string
  arriving: boolean
  eta: string
  destTc: string
}

export function ferryCrossingMs(metres: number): number {
  return Math.max(4, metres / FERRY_MPS / 60) * 60_000
}

export function placeFerry(
  from: GeoPoint,
  to: GeoPoint | null,
  departAt: number | null,
  arriveAt: number | null,
  now: number,
): { lng: number; lat: number; minutes: number } | null {
  const model = to ? ferryCrossingMs(metresBetween(from, to)) : null
  const window = sailingWindow(departAt, arriveAt, model)
  if (!window) return null
  if (now > window.end + 2 * 60_000) return null
  // A later sailing stays on the pier card. The boat is drawn once it is due to leave.
  if (now < window.start && window.start - now > 30 * 60_000) return null
  const minutes = Math.max(0, Math.round((window.end - now) / 60_000))
  if (now <= window.start || !to) return { lng: from.lng, lat: from.lat, minutes }
  const span = window.end - window.start
  const mix = span <= 0 ? 1 : Math.min(1, Math.max(0, (now - window.start) / span))
  return {
    lng: from.lng + (to.lng - from.lng) * mix,
    lat: from.lat + (to.lat - from.lat) * mix,
    minutes,
  }
}

export function estimateFerryVessels(
  tracks: readonly FerryTrack[],
  marks: readonly FerryMark[],
  gpsRoutes: ReadonlySet<string>,
  locate: (id: string) => GeoPoint | null,
  now: number,
): FerryVessel[] {
  const vessels: FerryVessel[] = []
  for (const track of tracks) {
    if (gpsRoutes.has(track.route)) continue
    const from = locate(track.fromId)
    if (!from) continue
    const to = track.toId ? locate(track.toId) : null
    const departures = instants(marks.filter((mark) => isDeparture(mark, track)), now)
    const arrivals = instants(marks.filter((mark) => isArrival(mark, track)), now)
    const arriveAt = arrivals.find((time) => time >= now - 2 * 60_000) ?? null
    const departAt = arriveAt == null
      ? departures.find((time) => time >= now - 2 * 60_000) ?? departures[departures.length - 1] ?? null
      : [...departures].reverse().find((time) => time < arriveAt) ?? null
    const place = placeFerry(from, to, departAt, arriveAt, now)
    if (!place) continue
    const end = sailingWindow(departAt, arriveAt, to ? ferryCrossingMs(metresBetween(from, to)) : null)?.end
    vessels.push({
      id: `run-${track.route}-${track.fromId}`,
      nameTc: `${track.fromTc} – ${track.toTc}`,
      nameEn: `${track.fromEn} – ${track.toEn}`,
      lng: place.lng,
      lat: place.lat,
      route: track.route,
      eta: end ? new Date(end).toISOString() : "",
      minutes: place.minutes,
      destTc: track.toTc,
      destEn: track.toEn,
    })
  }
  return vessels
}

function sailingWindow(departAt: number | null, arriveAt: number | null, model: number | null): { start: number; end: number } | null {
  if (departAt != null && arriveAt != null && arriveAt > departAt) return { start: departAt, end: arriveAt }
  if (arriveAt != null && model != null) return { start: arriveAt - model, end: arriveAt }
  if (departAt != null && model != null) return { start: departAt, end: departAt + model }
  if (departAt != null && arriveAt == null && model == null) return { start: departAt, end: departAt }
  return null
}

function instants(marks: readonly FerryMark[], now: number): number[] {
  return marks
    .map((mark) => ferryInstant(mark.eta, now))
    .filter((time): time is number => time != null && Number.isFinite(time))
    .sort((a, b) => a - b)
}

function isDeparture(mark: FerryMark, track: FerryTrack): boolean {
  return mark.route === track.route && !mark.arriving && mark.pierId === track.fromId && (!mark.destTc || mark.destTc === track.destTc)
}

function isArrival(mark: FerryMark, track: FerryTrack): boolean {
  return mark.route === track.route && mark.arriving && mark.pierId === track.toId
}

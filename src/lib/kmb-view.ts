export const KMB_MIN_ZOOM = 13
export const KMB_POLL_MS = 60_000
export const PLACE_POLL_MS = 12 * 60 * 60 * 1000

export function kmbViewKey(lng: number, lat: number, zoom: number): string {
  if (zoom < KMB_MIN_ZOOM) return "far"
  return `${lng.toFixed(3)},${lat.toFixed(3)}`
}

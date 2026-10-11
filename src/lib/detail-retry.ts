export const DETAIL_RETRY_MS = 5 * 60 * 1000

export type DetailEntry = {
  at: number
  body: unknown
}

export function detailIsDue(entry: DetailEntry | undefined, now: number, placeMs: number): boolean {
  return entry === undefined || now - entry.at >= placeMs
}

export function failedDetail(previous: DetailEntry | undefined, now: number, placeMs: number): DetailEntry {
  return {
    at: now - placeMs + DETAIL_RETRY_MS,
    body: previous === undefined ? null : previous.body,
  }
}

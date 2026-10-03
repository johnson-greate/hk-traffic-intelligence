export function nextStationSlice<T>(
  items: readonly T[],
  cursor: number,
  fetchedAt: (item: T) => number | null,
  now: number,
  staleMs: number,
  limit: number,
): { items: T[]; cursor: number } {
  const count = items.length
  if (count === 0 || limit <= 0) return { items: [], cursor: 0 }
  const start = ((cursor % count) + count) % count
  const chosen: T[] = []
  let walked = 0
  for (; walked < count && chosen.length < limit; walked += 1) {
    const item = items[(start + walked) % count]
    if (item === undefined) break
    const at = fetchedAt(item)
    if (at == null || now - at >= staleMs) chosen.push(item)
  }
  return { items: chosen, cursor: (start + walked) % count }
}

export function oldestDue<T>(
  items: readonly T[],
  fetchedAt: (item: T) => number | null,
  now: number,
  staleMs: number,
  limit: number,
): T[] {
  const due: T[] = []
  for (const item of items) {
    const at = fetchedAt(item)
    if (at == null || now - at >= staleMs) due.push(item)
  }
  due.sort((left, right) => (fetchedAt(left) ?? 0) - (fetchedAt(right) ?? 0))
  return due.slice(0, Math.max(0, limit))
}

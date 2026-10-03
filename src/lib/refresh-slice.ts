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

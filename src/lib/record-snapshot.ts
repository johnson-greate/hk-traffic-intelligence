import { ensureSchema, KEEP_DAYS, pruneHistory, saveSnapshot, type HistoryDb } from "./history-store.ts"
import { buildSnapshot } from "./snapshot.ts"
import type { ApproachesResponse, TrafficResponse } from "./types.ts"

const DAY_MS = 86_400_000
// A step that hangs fails with its name instead of the whole run being canceled silently.
const STEP_MS = 60_000

export type RecordResult = { saved: boolean; observedAt: string | null; reason?: string; ms: Record<string, number> }

// Reads the site's own API, so the snapshot sees exactly what the map shows and shares its cache.
export async function recordSnapshot(
  db: HistoryDb,
  load: (path: string) => Promise<Response>,
  now = Date.now(),
  stepMs = STEP_MS,
): Promise<RecordResult> {
  const ms: Record<string, number> = {}
  const step = <T>(name: string, work: () => Promise<T>) => timed(name, work, stepMs, ms)
  await step("schema", () => ensureSchema(db))
  const [traffic, approaches] = await Promise.all([
    step("traffic", () => readJson<TrafficResponse>(load("/api/traffic"))),
    // A missing crossing feed should not cost the road speeds.
    step("approaches", () => readJson<ApproachesResponse>(load("/api/approaches"))).catch(() => null),
  ])
  const snap = buildSnapshot(traffic, approaches)
  if (!snap) return { saved: false, observedAt: null, reason: traffic.error ?? "no road reading", ms }
  const saved = await step("save", () => saveSnapshot(db, snap))
  await step("prune", () => pruneHistory(db, now - KEEP_DAYS * DAY_MS))
  return { saved, observedAt: snap.observedAt, ms }
}

async function timed<T>(name: string, work: () => Promise<T>, limit: number, ms: Record<string, number>): Promise<T> {
  const start = Date.now()
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`snapshot step ${name} took over ${limit} ms`)), limit)
  })
  try {
    return await Promise.race([work(), late])
  } finally {
    clearTimeout(timer)
    ms[name] = Date.now() - start
  }
}

async function readJson<T>(pending: Promise<Response>): Promise<T> {
  const response = await pending
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

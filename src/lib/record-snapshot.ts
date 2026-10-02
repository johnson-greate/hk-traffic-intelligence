import { ensureSchema, KEEP_DAYS, pruneHistory, saveSnapshot, type HistoryDb } from "./history-store.ts"
import { buildSnapshot } from "./snapshot.ts"
import type { ApproachesResponse, TrafficResponse } from "./types.ts"

const DAY_MS = 86_400_000

export type RecordResult = { saved: boolean; observedAt: string | null; reason?: string }

// Reads the site's own API, so the snapshot sees exactly what the map shows and shares its cache.
export async function recordSnapshot(db: HistoryDb, load: (path: string) => Promise<Response>, now = Date.now()): Promise<RecordResult> {
  await ensureSchema(db)
  const [traffic, approaches] = await Promise.all([
    readJson<TrafficResponse>(load("/api/traffic")),
    // A missing crossing feed should not cost the road speeds.
    readJson<ApproachesResponse>(load("/api/approaches")).catch(() => null),
  ])
  const snap = buildSnapshot(traffic, approaches)
  if (!snap) return { saved: false, observedAt: null, reason: traffic.error ?? "no road reading" }
  const saved = await saveSnapshot(db, snap)
  await pruneHistory(db, now - KEEP_DAYS * DAY_MS)
  return { saved, observedAt: snap.observedAt }
}

async function readJson<T>(pending: Promise<Response>): Promise<T> {
  const response = await pending
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

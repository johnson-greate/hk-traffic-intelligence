import type { CrossingTime, Snapshot } from "./snapshot.ts"

// The part of Cloudflare D1 this store uses, so tests can stand in a local SQLite.
export type HistoryDb = {
  exec(sql: string): Promise<unknown>
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ meta: { changes: number } }>
      all<T>(): Promise<{ results: T[] }>
    }
  }
}

// Road speeds are about 50 KB a reading, so 30 days is about 0.4 GB, inside D1's 5 GB free storage.
export const KEEP_DAYS = 30

const SCHEMA = `CREATE TABLE IF NOT EXISTS snapshots (ts INTEGER PRIMARY KEY, observed_at TEXT NOT NULL, mean_speed REAL, free INTEGER NOT NULL, slow INTEGER NOT NULL, congested INTEGER NOT NULL, unknown INTEGER NOT NULL, crossings TEXT NOT NULL, speeds TEXT NOT NULL)`

export type HistoryRow = Omit<Snapshot, "speeds">

type StoredRow = {
  ts: number
  observed_at: string
  mean_speed: number | null
  free: number
  slow: number
  congested: number
  unknown: number
  crossings: string
}

export async function ensureSchema(db: HistoryDb): Promise<void> {
  await db.exec(SCHEMA)
}

// Returns false when this reading was already stored by an earlier tick.
export async function saveSnapshot(db: HistoryDb, snap: Snapshot): Promise<boolean> {
  const result = await db
    .prepare(
      "INSERT OR IGNORE INTO snapshots (ts, observed_at, mean_speed, free, slow, congested, unknown, crossings, speeds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(snap.ts, snap.observedAt, snap.meanSpeed, snap.free, snap.slow, snap.congested, snap.unknown, JSON.stringify(snap.crossings), JSON.stringify(snap.speeds))
    .run()
  return result.meta.changes > 0
}

export async function pruneHistory(db: HistoryDb, before: number): Promise<number> {
  const result = await db.prepare("DELETE FROM snapshots WHERE ts < ?").bind(before).run()
  return result.meta.changes
}

// City-wide figures and crossing times since a moment, oldest first. Road speeds stay in the table.
export async function readHistory(db: HistoryDb, since: number): Promise<HistoryRow[]> {
  const { results } = await db
    .prepare("SELECT ts, observed_at, mean_speed, free, slow, congested, unknown, crossings FROM snapshots WHERE ts >= ? ORDER BY ts")
    .bind(since)
    .all<StoredRow>()
  return results.map((row) => ({
    ts: row.ts,
    observedAt: row.observed_at,
    meanSpeed: row.mean_speed,
    free: row.free,
    slow: row.slow,
    congested: row.congested,
    unknown: row.unknown,
    crossings: JSON.parse(row.crossings) as CrossingTime[],
  }))
}

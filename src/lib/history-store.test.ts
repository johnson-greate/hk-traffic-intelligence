import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import { ensureSchema, pruneHistory, readHistory, saveSnapshot, type HistoryDb } from "./history-store.ts"
import type { Snapshot } from "./snapshot.ts"

// The subset of D1 the store uses, backed by Node's SQLite.
function memoryDb(): HistoryDb {
  const sqlite = new DatabaseSync(":memory:")
  return {
    exec: async (sql) => {
      sqlite.exec(sql)
    },
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => {
          const result = sqlite.prepare(sql).run(...(values as never[]))
          return { meta: { changes: Number(result.changes) } }
        },
        all: async <T>() => ({ results: sqlite.prepare(sql).all(...(values as never[])) as T[] }),
      }),
    }),
  }
}

const snap = (minute: number): Snapshot => ({
  ts: Date.UTC(2026, 9, 2, 11, minute),
  observedAt: `2026-10-02 19:${String(minute).padStart(2, "0")}:00`,
  meanSpeed: 60.4,
  free: 2,
  slow: 1,
  congested: 0,
  unknown: 0,
  crossings: [{ origin: "H11", code: "CH", minutes: 25 }],
  speeds: { "1": 62 },
})

const db = memoryDb()
await ensureSchema(db)
await ensureSchema(db) // safe to run on every cron tick

assert.equal(await saveSnapshot(db, snap(30)), true)
// The same reading twice is stored once.
assert.equal(await saveSnapshot(db, snap(30)), false)
assert.equal(await saveSnapshot(db, snap(35)), true)

const rows = await readHistory(db, Date.UTC(2026, 9, 2, 11, 0))
assert.deepEqual(
  rows.map((row) => row.observedAt),
  ["2026-10-02 19:30:00", "2026-10-02 19:35:00"],
)
assert.deepEqual(rows[0], {
  ts: Date.UTC(2026, 9, 2, 11, 30),
  observedAt: "2026-10-02 19:30:00",
  meanSpeed: 60.4,
  free: 2,
  slow: 1,
  congested: 0,
  unknown: 0,
  crossings: [{ origin: "H11", code: "CH", minutes: 25 }],
})
assert.equal((await readHistory(db, Date.UTC(2026, 9, 2, 11, 33))).length, 1)

assert.equal(await pruneHistory(db, Date.UTC(2026, 9, 2, 11, 33)), 1)
assert.equal((await readHistory(db, 0)).length, 1)

console.log("history store ok")

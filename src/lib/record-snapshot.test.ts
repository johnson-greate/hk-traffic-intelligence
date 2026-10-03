import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import type { HistoryDb } from "./history-store.ts"
import { recordSnapshot } from "./record-snapshot.ts"

function memoryDb(): HistoryDb {
  const sqlite = new DatabaseSync(":memory:")
  return {
    exec: async (sql) => {
      sqlite.exec(sql)
    },
    prepare: (sql) => ({
      bind: (...values) => ({
        run: async () => ({ meta: { changes: Number(sqlite.prepare(sql).run(...(values as never[])).changes) } }),
        all: async <T>() => ({ results: sqlite.prepare(sql).all(...(values as never[])) as T[] }),
      }),
    }),
  }
}

const traffic = {
  ok: true,
  observedAt: "2026-10-03 10:05:00",
  corridors: [{ id: "1", speedKmh: 50 }],
  summary: { meanSpeedKmh: 50, free: 1, slow: 0, congested: 0, unknown: 0 },
}
const json = (body: unknown) => Promise.resolve(Response.json(body))
const now = Date.UTC(2026, 9, 3, 2, 10)

// A normal run stores the reading and reports how long each step took.
const ok = await recordSnapshot(memoryDb(), (path) => json(path === "/api/traffic" ? traffic : { ok: true, points: [] }), now)
assert.equal(ok.saved, true)
assert.equal(ok.observedAt, "2026-10-03 10:05:00")
assert.deepEqual(Object.keys(ok.ms).sort(), ["approaches", "prune", "save", "schema", "traffic"])

// A feed that never answers fails with the step's name instead of hanging.
const never = new Promise<Response>(() => {})
await assert.rejects(
  recordSnapshot(memoryDb(), (path) => (path === "/api/traffic" ? never : json({ ok: true, points: [] })), now, 50),
  /snapshot step traffic took over 50 ms/,
)

// A hanging crossing feed costs only the crossing times.
const partial = await recordSnapshot(memoryDb(), (path) => (path === "/api/traffic" ? json(traffic) : never), now, 50)
assert.equal(partial.saved, true)

console.log("record snapshot ok")

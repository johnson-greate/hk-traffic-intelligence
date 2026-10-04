import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import type { HistoryDb } from "./history-store.ts"
import { allowQuestion, visitorKey } from "./ask-limit.ts"

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

const db = memoryDb()
const t0 = Date.UTC(2026, 9, 4, 3, 0)
const tenMin = 10 * 60_000

// Counted in D1, so every Worker instance sees the same five per ten minutes.
for (let i = 0; i < 5; i++) assert.equal(await allowQuestion(db, "a", t0 + i * 1000, 5, tenMin), true)
assert.equal(await allowQuestion(db, "a", t0 + 6000, 5, tenMin), false)
assert.equal(await allowQuestion(db, "b", t0 + 6000, 5, tenMin), true, "another visitor is not affected")
assert.equal(await allowQuestion(db, "a", t0 + tenMin + 1000, 5, tenMin), true, "the window slides")

// A refused question is not counted, so a visitor is not locked out longer by retrying.
const db2 = memoryDb()
for (let i = 0; i < 5; i++) await allowQuestion(db2, "c", t0, 5, tenMin)
for (let i = 0; i < 20; i++) await allowQuestion(db2, "c", t0 + 1000, 5, tenMin)
assert.equal(await allowQuestion(db2, "c", t0 + tenMin + 1, 5, tenMin), true)

// The visitor key is a hash: no IP is stored, and it changes from one day to the next.
const k1 = await visitorKey("203.0.113.9", t0)
assert.match(k1, /^[0-9a-f]{64}$/)
assert.ok(!k1.includes("203"))
assert.equal(k1, await visitorKey("203.0.113.9", t0 + 3_600_000))
assert.notEqual(k1, await visitorKey("203.0.113.9", t0 + 86_400_000))
assert.notEqual(k1, await visitorKey("203.0.113.10", t0))

console.log("ask limit ok")

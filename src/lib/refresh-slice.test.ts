import assert from "node:assert/strict"
import { nextStationSlice, oldestDue } from "./refresh-slice.ts"

const now = 1_000_000
const items = ["a", "b", "c", "d"]
const ages: Record<string, number | null> = { a: now - 5_000, b: null, c: now - 40_000, d: now - 20_000 }
const due = oldestDue(items, (item) => ages[item] ?? null, now, 20_000, 2)
assert.deepEqual(due, ["b", "c"])
assert.deepEqual(oldestDue(items, (item) => ages[item] ?? null, now, 20_000, 0), [])

const line = ["a", "b", "c", "d", "e", "f"]
const fresh = nextStationSlice(line, 0, () => null, now, 20_000, 2)
assert.deepEqual(fresh.items, ["a", "b"])
assert.equal(fresh.cursor, 2)
const second = nextStationSlice(line, fresh.cursor, () => null, now, 20_000, 2)
assert.deepEqual(second.items, ["c", "d"])
const agesOnLine: Record<string, number | null> = { a: now - 1_000, b: now - 1_000, c: null, d: now - 1_000, e: null, f: now - 40_000 }
const skipped = nextStationSlice(line, 0, (item) => agesOnLine[item] ?? null, now, 20_000, 2)
assert.deepEqual(skipped.items, ["c", "e"])
assert.equal(skipped.cursor, 5)

import assert from "node:assert/strict"
import { oldestDue } from "./refresh-slice.ts"

const now = 1_000_000
const items = ["a", "b", "c", "d"]
const ages: Record<string, number | null> = { a: now - 5_000, b: null, c: now - 40_000, d: now - 20_000 }
const due = oldestDue(items, (item) => ages[item] ?? null, now, 20_000, 2)
assert.deepEqual(due, ["b", "c"])
assert.deepEqual(oldestDue(items, (item) => ages[item] ?? null, now, 20_000, 0), [])

import assert from "node:assert/strict"
import { politeQueue } from "./polite-fetch.ts"

const run = politeQueue(2)
let active = 0
let peak = 0
const tasks = Array.from({ length: 6 }, () =>
  run(async () => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise((resolve) => setTimeout(resolve, 20))
    active -= 1
  }),
)
await Promise.all(tasks)
assert.equal(peak, 2)

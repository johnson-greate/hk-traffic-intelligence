import assert from "node:assert/strict"
import { SPEED_FRESH_MS, SPEED_RETRY_MS, speedReadingComplete, speedReadingTtl } from "./speed.ts"

assert.equal(speedReadingTtl(true), SPEED_FRESH_MS)
assert.equal(speedReadingTtl(false), SPEED_RETRY_MS)
assert.ok(SPEED_RETRY_MS < SPEED_FRESH_MS)
assert.equal(speedReadingComplete(true, true, true, true), true)
assert.equal(speedReadingComplete(false, true, true, true), false)
assert.equal(speedReadingComplete(true, true, true, false), false)

console.log("speed ok")

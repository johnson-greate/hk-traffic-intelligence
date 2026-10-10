import assert from "node:assert/strict"
import { DETAIL_RETRY_MS, detailIsDue, failedDetail } from "./detail-retry.ts"

const placeMs = 24 * 60 * 60 * 1000
const now = 1_700_000_000_000

const first = failedDetail(undefined, now, placeMs)
assert.equal(first.body, null)
assert.equal(detailIsDue(first, now + DETAIL_RETRY_MS - 1, placeMs), false)
assert.equal(detailIsDue(first, now + DETAIL_RETRY_MS, placeMs), true)

const second = failedDetail(first, now + DETAIL_RETRY_MS, placeMs)
assert.equal(second.body, null)
assert.equal(detailIsDue(second, now + 2 * DETAIL_RETRY_MS - 1, placeMs), false)
assert.equal(detailIsDue(second, now + 2 * DETAIL_RETRY_MS, placeMs), true)

const stored = { at: now - placeMs, body: { sentence: "Wan Chai via Aberdeen Tunnel" } }
const kept = failedDetail(stored, now, placeMs)
assert.equal(kept.body, stored.body)
assert.equal(detailIsDue(kept, now + DETAIL_RETRY_MS - 1, placeMs), false)
assert.equal(detailIsDue(kept, now + DETAIL_RETRY_MS, placeMs), true)

console.log("detail retry ok")

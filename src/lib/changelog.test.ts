import assert from "node:assert/strict"
import { CHANGELOG, changelogIsFresh, changelogText } from "./changelog.ts"

const hidden = ["token", "cache", "429", "html", "worker", "isolate", "oauth"]
assert.ok(CHANGELOG.length > 0)
for (const entry of CHANGELOG) {
  assert.match(entry.date, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(entry.en.length > 12)
  assert.ok(entry.tc.length > 8)
  assert.ok(entry.sc.length > 8)
  assert.equal(changelogText(entry, "en"), entry.en)
  assert.equal(changelogText(entry, "zh-HK"), entry.tc)
  assert.equal(changelogText(entry, "zh-CN"), entry.sc)
  const blob = `${entry.en} ${entry.tc} ${entry.sc}`.toLowerCase()
  for (const word of hidden) assert.equal(blob.includes(word), false, `${entry.id} ${word}`)
}

const today = [{ date: "2026-10-11" }]
assert.equal(changelogIsFresh(today, new Date("2026-10-11T04:00:00Z")), true)
assert.equal(changelogIsFresh(today, new Date("2026-10-11T16:00:00Z")), false)
assert.equal(changelogIsFresh(today, new Date("2026-10-10T16:00:00Z")), true)
assert.equal(changelogIsFresh([], new Date("2026-10-11T04:00:00Z")), false)

const stamped = [{ date: "2026-10-11", at: "2026-10-11T16:13:11Z" }]
assert.equal(changelogIsFresh(stamped, new Date("2026-10-11T17:41:00Z")), true)
assert.equal(changelogIsFresh(stamped, new Date("2026-10-12T16:13:10Z")), true)
assert.equal(changelogIsFresh(stamped, new Date("2026-10-12T16:13:11Z")), false)
const published = Date.parse(CHANGELOG[0]?.at ?? `${CHANGELOG[0]?.date ?? ""}T00:00:00+08:00`)
assert.equal(changelogIsFresh(CHANGELOG, new Date(published + 60_000)), true)
assert.equal(changelogIsFresh(CHANGELOG, new Date(published + 24 * 60 * 60 * 1000)), false)

console.log("changelog ok")

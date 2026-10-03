import assert from "node:assert/strict"
import { ferryCalls, ferryMinutes, starFerryRemark, starSailings } from "./ferry-clock.ts"

const now = Date.parse("2026-10-03T04:00:00+08:00")
const calls = ferryCalls([
  { route: "CECC", destTc: "長洲", destEn: "Cheung Chau", eta: "2026-10-03T04:15:00+08:00" },
], now)
assert.equal(calls[0]?.minutes, 15)
assert.equal(calls[0]?.route, "CECC")
assert.equal(ferryMinutes("04:48", now), 48)
assert.equal(ferryMinutes("03:50", now), null)
assert.deepEqual(starFerryRemark("6 -- 8"), { remarkTc: "6至8分鐘一班", remarkEn: "every 6 to 8 min" })
assert.deepEqual(starFerryRemark("6"), { remarkTc: "6分鐘一班", remarkEn: "every 6 min" })

const sheet = {
  from: "star-central",
  csv: [
    "Central to Tsim Sha Tsui,Mon – Fri  (Except Public Holidays),9:55am-8:40pm,6 -- 8",
    "Central to Tsim Sha Tsui,\"Sat, Sun & Public Holidays\",7:25am-10:40pm,6 -- 8",
    "Tsim Sha Tsui to Central,\"Sat, Sun & Public Holidays\",7:15am-10:30pm,6 --8",
  ].join("\n"),
}
const saturday = starSailings([sheet], Date.parse("2026-10-03T10:00:00+08:00"))
assert.deepEqual(saturday.map((row) => row.pierId), ["star-central", "star-tst"])
assert.equal(saturday[0]?.remarkEn, "every 6 to 8 min")
const friday = starSailings([sheet], Date.parse("2026-10-02T10:00:00+08:00"))
assert.deepEqual(friday.map((row) => row.pierId), ["star-central"])
assert.equal(starSailings([sheet], Date.parse("2026-10-03T05:00:00+08:00")).length, 0)

const wanChai = {
  from: "star-wanchai",
  csv: [
    "Wanchai to Tsim Sha Tsui,Mon – Sat (Except Public Holidays),9:12am-4:48pm,12",
    "Wanchai to Tsim Sha Tsui,Sun & Public Holidays,7:40am-1:00pm,20",
    "Tsim Sha Tsui to Wanchai,Mon – Sat (Except Public Holidays),9:12am-4:48pm,12",
    "Tsim Sha Tsui to Wanchai,Sun & Public Holidays,7:40am-1:00pm,20",
  ].join("\n"),
}
const saturdayNoon = starSailings([wanChai], Date.parse("2026-10-03T12:24:00+08:00"))
assert.deepEqual(saturdayNoon.map((row) => row.remarkEn), ["every 12 min", "every 12 min"])
const sundayNoon = starSailings([wanChai], Date.parse("2026-10-04T12:24:00+08:00"))
assert.deepEqual(sundayNoon.map((row) => row.remarkEn), ["every 20 min", "every 20 min"])

const everyDay = {
  from: "star-central",
  csv: "Central to Tsim Sha Tsui,Mon – Sun,9:00am-9:00pm,8",
}
assert.equal(starSailings([everyDay], Date.parse("2026-10-02T12:00:00+08:00"))[0]?.remarkEn, "every 8 min")
assert.equal(starSailings([everyDay], Date.parse("2026-10-03T12:00:00+08:00"))[0]?.remarkEn, "every 8 min")
assert.equal(starSailings([everyDay], Date.parse("2026-10-04T12:00:00+08:00"))[0]?.remarkEn, "every 8 min")

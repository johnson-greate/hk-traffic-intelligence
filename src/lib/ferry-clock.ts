export type FerryClockCall = {
  route: string
  destTc: string
  destEn: string
  eta: string
  minutes: number
  remarkTc: string
  remarkEn: string
}

export function ferryMinutes(eta: string, now: number): number | null {
  const trimmed = eta.trim()
  if (!trimmed) return null
  const iso = Date.parse(trimmed)
  if (Number.isFinite(iso) && trimmed.includes("T")) return Math.max(0, Math.round((iso - now) / 60_000))
  const match = /(\d{1,2}):(\d{2})/.exec(trimmed)
  if (!match?.[1] || !match[2]) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  if (/pm/i.test(trimmed) && hours < 12) hours += 12
  if (/am/i.test(trimmed) && hours === 12) hours = 0
  const hongKong = new Date(now + 8 * 60 * 60 * 1000)
  const instant = Date.UTC(hongKong.getUTCFullYear(), hongKong.getUTCMonth(), hongKong.getUTCDate(), hours, minutes) - 8 * 60 * 60 * 1000
  if (instant < now - 2 * 60_000) return null
  return Math.max(0, Math.round((instant - now) / 60_000))
}

export function ferryCalls(rows: { route: string; destTc: string; destEn: string; eta: string }[], now: number): FerryClockCall[] {
  const calls: FerryClockCall[] = []
  for (const row of rows) {
    const minutes = ferryMinutes(row.eta, now)
    if (minutes == null) continue
    calls.push({ route: row.route, destTc: row.destTc, destEn: row.destEn, eta: row.eta, minutes, remarkTc: "", remarkEn: "" })
  }
  calls.sort((a, b) => a.minutes - b.minutes || a.route.localeCompare(b.route))
  return calls.slice(0, 6)
}

export type StarClock = {
  route: string
  destTc: string
  destEn: string
  eta: string
  pierId: string
  remarkTc: string
  remarkEn: string
}

export function starSailings(sheets: { from: string; csv: string }[], now: number): StarClock[] {
  const hongKong = new Date(now + 8 * 60 * 60 * 1000)
  const day = hongKong.getUTCDay()
  const minuteOfDay = hongKong.getUTCHours() * 60 + hongKong.getUTCMinutes()
  const clocksForNow: StarClock[] = []
  for (const sheet of sheets) {
    for (const line of sheet.csv.split(/\r?\n/)) {
      const cells = splitCsv(line)
      const direction = cells[0] ?? ""
      const when = cells[1] ?? ""
      const hours = cells[2] ?? ""
      const frequency = cells[3] ?? ""
      if (!direction.includes(" to ")) continue
      if (!timetableApplies(when, day)) continue
      const span = hourSpan(hours)
      if (!span || minuteOfDay < span.start || minuteOfDay > span.end) continue
      const remark = starFerryRemark(frequency)
      const destEn = direction.split(" to ").pop()?.trim() ?? ""
      clocksForNow.push({
        route: "天星",
        destTc: destEn.includes("Tsim") ? "尖沙咀" : destEn.includes("Wan") ? "灣仔" : "中環",
        destEn,
        eta: "",
        pierId: direction.startsWith("Tsim") ? "star-tst" : direction.startsWith("Wan") ? "star-wanchai" : sheet.from,
        remarkTc: remark.remarkTc,
        remarkEn: remark.remarkEn,
      })
    }
  }
  return clocksForNow
}

// A public-holiday band is not applied on its own. The timetable has no holiday calendar.
function timetableApplies(when: string, day: number): boolean {
  const mon = /\bmon/i.test(when)
  const fri = /\bfri/i.test(when)
  const sat = /\bsat/i.test(when)
  const sun = /\bsun/i.test(when)
  const coversWeekdays = (mon && fri) || (mon && (sat || sun))
  const coversSaturday = sat || (mon && sun)
  if (day === 6) return coversSaturday
  if (day === 0) return sun
  return coversWeekdays
}

function hourSpan(value: string): { start: number; end: number } | null {
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(value)
  if (!match?.[1] || !match[2] || !match[4] || !match[5]) return null
  return { start: clockMinutes(match[1], match[2], match[3]), end: clockMinutes(match[4], match[5], match[6] || match[3]) }
}

function clockMinutes(hourText: string, minuteText: string, suffix: string | undefined): number {
  let hours = Number(hourText)
  const minutes = Number(minuteText)
  if (/pm/i.test(suffix ?? "") && hours < 12) hours += 12
  if (/am/i.test(suffix ?? "") && hours === 12) hours = 0
  return hours * 60 + minutes
}

function splitCsv(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (const char of line) {
    if (char === "\"") {
      quoted = !quoted
      continue
    }
    if (char === "," && !quoted) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function starFerryRemark(frequency: string): { remarkTc: string; remarkEn: string } {
  const numbers = [...frequency.matchAll(/\d+/g)].map((match) => match[0]).filter(Boolean)
  const first = numbers[0]
  const second = numbers[1]
  if (!first) return { remarkTc: "", remarkEn: "" }
  if (!second || second === first) return { remarkTc: `${first}分鐘一班`, remarkEn: `every ${first} min` }
  return { remarkTc: `${first}至${second}分鐘一班`, remarkEn: `every ${first} to ${second} min` }
}

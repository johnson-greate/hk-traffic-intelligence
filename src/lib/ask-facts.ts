import { jammedRoads } from "./briefing-facts.ts"
import { controlName } from "./i18n.ts"
import type { ApproachPoint, Corridor, SpeedSummary, WeatherConditions } from "./types.ts"

// The facts a question is answered from: more detail than the briefing, so a question about
// one start, one road or one boundary hall can be answered, and nothing the feeds do not say.

export type AskInput = {
  at: Date
  traffic: { ok: boolean; corridors: Corridor[]; summary: SpeedSummary } | null
  starts: ApproachPoint[]
  incidents: { tc: string; en: string; whereTc: string; whereEn: string }[]
  warnings: { name: string }[]
  conditions: WeatherConditions | null
  halls: GeoJSON.Feature[] | null
}

const TUNNEL: Record<string, string> = {
  CH: "Cross-Harbour Tunnel (紅隧)",
  EH: "Eastern Harbour Crossing (東隧)",
  WH: "Western Harbour Crossing (西隧)",
}

// Immigration Department queue codes, as the intel panel reads them.
const QUEUE: Record<number, string> = { 0: "normal", 1: "busy", 2: "very busy", 4: "under maintenance", 99: "closed" }
const HALLS = [
  ["residentArrCode", "residents arriving"],
  ["residentDepCode", "residents departing"],
  ["visitorArrCode", "visitors arriving"],
  ["visitorDepCode", "visitors departing"],
] as const

const HK_OFFSET_MS = 8 * 3_600_000

export function askFacts(input: AskInput): string {
  const lines = [`Time: ${new Date(input.at.getTime() + HK_OFFSET_MS).toISOString().slice(0, 16).replace("T", " ")} Hong Kong time`]
  const summary = input.traffic?.ok ? input.traffic.summary : null
  lines.push(
    summary && summary.meanSpeedKmh != null
      ? `Road network: mean ${Math.round(summary.meanSpeedKmh)} km/h; segments free ${summary.free}, slow ${summary.slow}, congested ${summary.congested}`
      : "Road network: no reading",
  )
  const crossingLines = input.starts.flatMap((start) => {
    const legs = start.legs.filter((leg) => leg.code in TUNNEL && leg.minutes != null)
    if (legs.length === 0) return []
    return [`Harbour crossing times from ${start.nameTc} (${start.name}): ${legs.map((leg) => `${TUNNEL[leg.code]} ${leg.minutes} min`).join(", ")}`]
  })
  lines.push(...(crossingLines.length > 0 ? crossingLines : ["Harbour crossing times: no reading"]))
  const jams = input.traffic?.ok ? jammedRoads(input.traffic.corridors, 8) : []
  lines.push(
    jams.length > 0
      ? `Congested roads, longest first: ${jams.map((road) => `${road.tc} ${road.en} ${road.km} km, slowest ${road.slowestKmh} km/h`).join("; ")}`
      : "Congested roads: none",
  )
  // Stated even when empty: unlike the briefing, a question about them needs to hear "none".
  lines.push(
    `Open traffic incidents: ${input.incidents.length > 0 ? input.incidents.map((row) => `${row.tc} ${row.en} at ${row.whereTc} ${row.whereEn}`.replace(/\s+/g, " ").trim()).join("; ") : "none"}`,
  )
  lines.push(`Weather warnings now in effect: ${input.warnings.length > 0 ? input.warnings.map((row) => row.name).join("; ") : "none"}`)
  if (input.conditions?.temperatureC != null) {
    const rain = input.conditions.rainfallMm == null ? "" : `, rainfall in the past hour ${input.conditions.rainfallMm} mm`
    lines.push(`Weather: ${input.conditions.temperatureC}°C${rain}`)
  }
  if (!input.halls) {
    lines.push("Boundary control points: no reading")
  } else {
    lines.push("Boundary halls: arriving means entering Hong Kong; departing means leaving Hong Kong for the Mainland; normal, busy and very busy describe how crowded each hall's queue is")
    for (const hall of input.halls) {
      const p = (hall.properties ?? {}) as Record<string, unknown>
      const code = String(p.code ?? "")
      const english = String(p.name ?? code)
      const states = HALLS.map(([key, label]) => [label, QUEUE[Number(p[key])] ?? "no reading"] as const)
      const status = states.every(([, state]) => state === "normal") ? "all four halls normal (residents and visitors, arriving and departing)" : states.map(([label, state]) => `${label} ${state}`).join(", ")
      lines.push(`Boundary control point ${controlName("zh-HK", code, english)} (${english}): ${status}`)
    }
  }
  return lines.join("\n")
}

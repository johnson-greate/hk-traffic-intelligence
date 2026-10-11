import type { HarbourJourney } from "@/lib/types"

export type JourneyMinute = {
  locationId: string
  destinationId: string
  minutes: number
  colour: HarbourJourney["colour"]
  capturedAt: string
}

export function parseJourneyTimes(xml: string): JourneyMinute[] {
  const rows: JourneyMinute[] = []
  for (const block of xml.match(/<jtis_journey_time>[\s\S]*?<\/jtis_journey_time>/g) ?? []) {
    const locationId = tag(block, "LOCATION_ID")
    const destinationId = tag(block, "DESTINATION_ID")
    const minutes = wholeMinutes(tag(block, "JOURNEY_DATA"))
    if (!locationId || !destinationId || minutes == null) continue
    rows.push({
      locationId,
      destinationId,
      minutes,
      colour: colourOf(tag(block, "COLOUR_ID")),
      capturedAt: tag(block, "CAPTURE_DATE"),
    })
  }
  return rows
}

function tag(block: string, name: string): string {
  const found = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))
  return found?.[1]?.trim() ?? ""
}

function wholeMinutes(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 300) return null
  return parsed
}

function colourOf(value: string): HarbourJourney["colour"] {
  switch (value) {
    case "1":
      return "red"
    case "2":
      return "amber"
    case "3":
      return "green"
    default:
      return "none"
  }
}

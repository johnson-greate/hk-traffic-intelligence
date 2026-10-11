import assert from "node:assert/strict"
import { parseJourneyTimes } from "./journey-times.ts"

const xml = `<?xml version="1.0"?>
<jtis_journey_list>
  <jtis_journey_time>
    <LOCATION_ID>H2</LOCATION_ID>
    <DESTINATION_ID>CH</DESTINATION_ID>
    <CAPTURE_DATE>2026-10-09T21:58:00</CAPTURE_DATE>
    <JOURNEY_DATA>7</JOURNEY_DATA>
    <COLOUR_ID>3</COLOUR_ID>
  </jtis_journey_time>
  <jtis_journey_time>
    <LOCATION_ID>H6</LOCATION_ID>
    <DESTINATION_ID>ABT</DESTINATION_ID>
    <CAPTURE_DATE>2026-10-09T21:58:00</CAPTURE_DATE>
    <JOURNEY_DATA>9</JOURNEY_DATA>
    <COLOUR_ID>3</COLOUR_ID>
  </jtis_journey_time>
  <jtis_journey_time>
    <LOCATION_ID>H1</LOCATION_ID>
    <DESTINATION_ID>EH</DESTINATION_ID>
    <CAPTURE_DATE>2026-10-09T21:58:00</CAPTURE_DATE>
    <JOURNEY_DATA>-1</JOURNEY_DATA>
    <COLOUR_ID>1</COLOUR_ID>
  </jtis_journey_time>
</jtis_journey_list>`

const rows = parseJourneyTimes(xml)
assert.deepEqual(rows.map((row) => [row.locationId, row.destinationId, row.minutes, row.colour]), [
  ["H2", "CH", 7, "green"],
  ["H6", "ABT", 9, "green"],
])

console.log("journey times ok")

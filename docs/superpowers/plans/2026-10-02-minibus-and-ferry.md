# Minibus and ferry arrivals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show green minibuses, New Lantao buses, Sun Ferry, Hong Kong and Kowloon Ferry, and the Star Ferry timetable on the same map as the buses, without a new request style and without a heavier phone.

**Architecture:** A place is a catalogue (stop, pier, or route list) refreshed at most once a day. A clock is the arrival time, remembered for 60 seconds and kept for 3 minutes when a read fails. The phone receives only the places inside the current view. Green minibus and New Lantao Bus reuse the KMB and Citybus place-plus-clock split. The ferries are a handful of fixed piers plus one shared clock for every visitor. Sun Ferry also reports a vessel position; that dot updates when the clock response arrives, not on every animation frame.

**Tech Stack:** Next.js 16, React 19, MapLibre GL, the existing `fetchUpstream` cache, `etaQueue`, `mergePlaceArrivals`, and `routesWithoutArrival`.

## Global Constraints

- Do not import a full stop catalogue into the client bundle.
- Dots appear at zoom 13 or closer. Name plates are built only at zoom 16.5 or closer, the same rule as KMB and Citybus.
- Green minibus stops in one view are capped at 24, inside the same radius helper as KMB (`kmbReachMetres`). One upstream call per stop, `GET https://data.etagmb.gov.hk/eta/stop/{stop_id}`, through the existing `etaQueue` of 6. Not one call per route. Do not raise that queue.
- The green minibus catalogue is built offline. There is no bulk stop list. `GET /stop/{stop_id}` is one stop, and its coordinates are `data.coordinates.wgs84` only. The `hk80` pair is a grid position and must not be drawn. Do not walk every route or every stop from a visitor request.
- New Lantao Bus requests run only when the map centre is inside Lantau (longitude 113.80 to 114.05, latitude 22.18 to 22.34). A view of Kowloon must not wake the nearest Lantau stops.
- New Lantao Bus list calls are `https://rt.data.gov.hk/v2/transport/nlb/route.php?action=list` and `stop.php?action=list&routeId={id}`. The clock call is confirmed against a live stop before it is copied into the feed. It is not `https://rt.data.gov.hk/v2/transport/nlb/eta`.
- Ferry clocks are not tied to the map centre. Cache one copy of each route for 60 seconds. Sun Ferry is about 16 route codes. Hong Kong and Kowloon Ferry is 4 route ids and 2 directions. Star Ferry is one timetable file, cached 24 hours.
- A failed clock keeps the last good reading (`nextReading` in `src/lib/last-reading.ts`). The pier or stop stays on the map.
- Layer counts stay limited to road works and incidents. New layers have no number.
- Do not add another `requestAnimationFrame` loop that calls `setData`.
- Tests run with `node --experimental-strip-types`. New test files are excluded from `tsconfig.json`. Imports in those tests are relative and do not use `@/`.

---

### Task 1: Green minibus places and clocks

**Files:**
- Create: `scripts/build-gmb-network.mjs`
- Create: `data/gmb-network.json`
- Create: `src/lib/gmb-network.ts`
- Create: `src/lib/gmb-feed.ts`
- Create: `src/lib/gmb-reach.test.ts`
- Create: `src/app/api/gmb/places/route.ts`
- Create: `src/app/api/gmb/route.ts`
- Modify: `src/lib/types.ts`
- Test: `src/lib/gmb-reach.test.ts`

**Interfaces:**
- Consumes: `etaQueue`, `pool`, `fetchUpstream`, `etaDue`, `heldRows`, `forgetStale`, `arrivalFailure`, `kmbReachMetres`, `viewCachedGet`
- Produces: `loadGmbPlaces(lng, lat, now, zoom) -> GmbPlacesResponse` and `loadGmbNear(lng, lat, now, zoom) -> GmbResponse`. Each stop is `{ id, nameTc, nameEn, lng, lat, routes, calls }`. `calls` may be empty. `routes` always comes from the catalogue.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { gmbStopsWithin } from "./gmb-reach.ts"

const near = gmbStopsWithin(114.172, 22.305, 400, 24)
assert.ok(near.length > 0)
assert.ok(near.length <= 24)
assert.ok(near.every((stop) => Array.isArray(stop.routes)))
```

Run: `node --experimental-strip-types src/lib/gmb-reach.test.ts`
Expected: FAIL because `gmb-network.ts` does not exist.

- [ ] **Step 2: Build the catalogue once**

`scripts/build-gmb-network.mjs` reads `/route/{region}` for `HKI`, `KLN`, and `NT`, then `/route/{region}/{code}` for each code, then `/route-stop/{route_id}/{route_seq}` for the stop ids and names, then `/stop/{stop_id}` once per unique stop. Latitude and longitude come from `data.coordinates.wgs84`. The script sleeps between calls. It writes `data/gmb-network.json` as `{ stops: { [id]: { tc, en, lng, lat, routes } } }`. It is not called from a request, and the running server does not repeat this walk.

- [ ] **Step 3: Implement the view**

`gmbStopsWithin` lives in `src/lib/gmb-reach.ts` with no `@/` import, so the node test can load it. `loadGmbPlaces` reads the bundled file and returns those stops. It does not refresh the catalogue from the network. `loadGmbNear` skips a stop whose clock is younger than 60 seconds, fetches `/eta/stop/{id}` inside `etaQueue`, and still returns the stop when the clock is empty. `cacheable` is false when any stop in the view was missed.

- [ ] **Step 4: Run the test**

Run: `node --experimental-strip-types src/lib/gmb-reach.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-gmb-network.mjs data/gmb-network.json src/lib/gmb-network.ts src/lib/gmb-feed.ts src/lib/gmb-reach.test.ts src/app/api/gmb src/lib/types.ts tsconfig.json
git commit -m "Add green minibus stops and refresh only their arrival clock."
```

### Task 2: Draw green minibuses with the existing stop card

**Files:**
- Modify: `src/lib/types.ts` (`WatchLayer` gains `"gmb"`)
- Modify: `src/components/dashboard.tsx`
- Modify: `src/components/city-map.tsx`
- Modify: `src/components/layer-dock.tsx`
- Modify: `src/components/map-cards.ts`
- Modify: `src/lib/i18n.ts`

**Interfaces:**
- Consumes: `mergePlaceArrivals`, `routesWithoutArrival`, `placeStopPlate`, `LABEL_MIN_ZOOM`, `KMB_MIN_ZOOM`, `PLACE_POLL_MS`, `KMB_POLL_MS`
- Produces: a `gmb-stops` circle layer and `gmb-stop-label` symbol layer. The dock id is `gmb`. Its count is `null`.

- [ ] **Step 1: Extend the switches**

Add `"gmb"` to `WatchLayer` and every switch that already has `"citybus"`: `layerIds` in `city-map.tsx`, `layerLabel` in `layer-dock.tsx`, and the `kinds` array. The exhaustive `never` default must still compile. `LAYERS_ON.gmb` is true. The swatch is `#65a30d`.

- [ ] **Step 2: Poll places and clocks separately**

```ts
const gmbPlacesUrl = layers.gmb && kmbQuery ? `/api/gmb/places?${kmbQuery}` : null
const gmbUrl = layers.gmb && kmbQuery ? `/api/gmb?${kmbQuery}` : null
const gmbPlacesLive = useLiveJson<GmbPlacesResponse>(gmbPlacesUrl, PLACE_POLL_MS)
const gmbLive = useLiveJson<GmbResponse>(gmbUrl, KMB_POLL_MS)
const gmbMerged = useMemo(
  () => mergePlaceArrivals(gmbPlacesLive.data, gmbLive.data),
  [gmbLive.data, gmbPlacesLive.data],
)
```

`kmbQuery` already requires zoom 13 and the same centre bucket. Do not add a second view reporter.

- [ ] **Step 3: Draw like Citybus**

The GeoJSON properties are `nameTc`, `nameEn`, `board` (JSON calls), and `routes` (JSON route numbers). The circle is drawn for every stop in that collection. The plate is created only when `map.getZoom() >= LABEL_MIN_ZOOM`, using `stop.routes` when that list is non-empty. The popup is `busStopPopup`. A stop with routes and no clock shows the route numbers and the existing empty-board sentence.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit --pretty false --incremental false`
Expected: no new error under `src/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/i18n.ts src/components/dashboard.tsx src/components/city-map.tsx src/components/layer-dock.tsx src/components/map-cards.ts
git commit -m "Show green minibus stops on the map with the bus stop card."
```

### Task 3: New Lantao Bus on the Citybus pattern

**Files:**
- Create: `scripts/build-nlb-network.mjs`
- Create: `data/nlb-network.json`
- Create: `src/lib/nlb-network.ts`
- Create: `src/lib/nlb-feed.ts`
- Create: `src/app/api/nlb/places/route.ts`
- Create: `src/app/api/nlb/route.ts`
- Modify: the same layer switches as Task 2, with id `nlb` and swatch `#0f766e`

**Interfaces:**
- Consumes: the Citybus pair picker in `src/lib/citybus-feed.ts`. Move `arrivalPairs` into `src/lib/arrival-pairs.ts` and export `arrivalPairs(stops, pairBudget)`.
- Produces: `loadNlbPlaces` and `loadNlbNear`. Stop lists come from `stop.php?action=list&routeId={id}`. The pair budget stays 24. The stop cap stays 6. Both functions return an empty list when the centre is outside the Lantau box above.

- [ ] **Step 1: Write the failing pair test**

```ts
import assert from "node:assert/strict"
import { arrivalPairs } from "./arrival-pairs.ts"

const pairs = arrivalPairs([
  { id: "a", routes: ["1", "2", "3"] },
  { id: "b", routes: ["4"] },
], 3)
assert.deepEqual(pairs, [
  { stopId: "a", route: "1" },
  { stopId: "a", route: "2" },
  { stopId: "a", route: "3" },
])
```

Citybus `loadCitybusNear` must call this same function with budget 24. Its current behaviour does not change.

- [ ] **Step 2: Build `data/nlb-network.json` from the route list and each route's stop list.** Same record shape as Citybus: `{ tc, en, lng, lat, routes }`.

- [ ] **Step 3: Implement `loadNlbNear` as the Citybus clock loop with the NLB URL and `etaQueue`.** Empty clocks still return the stop. `cacheable` is false when a pair is missed.

- [ ] **Step 4: Draw `nlb-stops` with the Citybus plate and popup.** Places poll every `PLACE_POLL_MS`. Clocks poll every 60 seconds. The URL is sent only when zoom is at least 13.

- [ ] **Step 5: Run `node --experimental-strip-types src/lib/arrival-pairs.test.ts` and `npx tsc --noEmit --pretty false --incremental false`.** Expected: pass, and no new `src/` error.

- [ ] **Step 6: Commit** `Add New Lantao Bus stops using the Citybus arrival budget.`

### Task 4: Ferry piers, clocks, and the Sun Ferry vessel

**Files:**
- Create: `data/ferry-piers.json`
- Create: `src/lib/ferry-feed.ts`
- Create: `src/lib/ferry-feed.test.ts`
- Create: `src/app/api/ferry/route.ts`
- Modify: layer switches with one id, `ferry`, swatch `#0369a1`

**Interfaces:**
- Consumes: `fetchUpstream`, `oldestDue`, `nextReading`
- Produces: `FerryResponse` `{ ok, observedAt, piers, vessels }`. A pier is `{ id, nameTc, nameEn, lng, lat, calls }`. A call is `{ route, destTc, destEn, eta, minutes }`. A vessel is `{ id, nameTc, nameEn, lng, lat, route, eta }` and exists only when Sun Ferry sent coordinates.

`data/ferry-piers.json` is written by hand from the operator pier lists. It contains the Star Ferry piers (Central, Tsim Sha Tsui, Wan Chai), the Hong Kong and Kowloon Ferry piers named in their route API, and the Sun Ferry piers for Central, Cheung Chau, Mui Wo, North Point, Hung Hom, and Kowloon City. The file does not contain arrival times.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict"
import { ferryCalls } from "./ferry-feed.ts"

const calls = ferryCalls([
  { route: "CECC", destTc: "長洲", destEn: "Cheung Chau", eta: "2026-10-03T04:15:00+08:00" },
], Date.parse("2026-10-03T04:00:00+08:00"))
assert.equal(calls[0]?.minutes, 15)
assert.equal(calls[0]?.route, "CECC")
```

- [ ] **Step 2: Refresh clocks in one shared snapshot**

`loadFerrySnapshot` runs for every visitor, like `loadMtrSnapshot`. It does not take a map centre. Hong Kong and Kowloon Ferry uses `https://www.hkkfeta.com/opendata/eta/{route_id}/{direction}` for route ids 1, 2, 3 and directions `inbound` and `outbound`. Sun Ferry uses `https://www.sunferry.com.hk/eta/?route={code}` for the route codes in its specification. Each route is fetched only when its copy is older than 60 seconds, at most 4 at a time, through `etaQueue`. A route that fails keeps its previous calls for 3 minutes.

Star Ferry uses the Central to Tsim Sha Tsui and Wan Chai to Tsim Sha Tsui timetable CSVs on DATA.GOV.HK. Those files are fetched at most once a day. The cells are clock times, not ISO timestamps. The next call is the next `HH:MM` on today's Asia/Hong_Kong table. It is stored on the matching pier with `minutes` set from that clock. It is not stored as a vessel, because the file has no position.

- [ ] **Step 3: Draw piers from `data/ferry-piers.json` in the client, not from the clock response.** The clock response only fills `calls` by pier id. Pier dots are drawn at every zoom, because there are fewer than 20. Plates still wait for zoom 16.5. Vessel dots use a separate GeoJSON source and are replaced only when `vessels` changes. Do not interpolate them with `requestAnimationFrame`.

- [ ] **Step 4: Run the ferry test and `tsc`.** Expected: the minutes assertion passes.

- [ ] **Step 5: Commit** `Show ferry piers from a fixed list and share one arrival clock.`

### Task 5: Phone check

**Files:** no new source unless a step fails.

- [ ] **Step 1: On a zoomed-out map, confirm the network panel shows no green-minibus or New Lantao request.** The place URL is null below zoom 13.

- [ ] **Step 2: At zoom 16 or closer on Jordan, confirm `/api/gmb/places` returns at most 24 stops and `/api/gmb` reuses those ids.** A second call within 60 seconds does not need a new upstream read for a stop already remembered.

- [ ] **Step 3: Confirm `/api/ferry` returns the same pier ids on two calls, and the second call is served from the 60-second snapshot.**

- [ ] **Step 4: Commit only if a cap or a cache guard was missing.**

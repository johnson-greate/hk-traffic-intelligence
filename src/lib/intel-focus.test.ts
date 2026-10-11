import assert from "node:assert/strict"
import { layerForIntel, layersForIntel } from "./intel-focus.ts"
import { PREFERENCE_DEFAULTS, soloLayers } from "./preferences.ts"
import type { WatchLayers } from "./types.ts"

assert.equal(layerForIntel("incident"), "incidents")
assert.equal(layerForIntel("works"), "works")
assert.equal(layerForIntel("jam"), "speed")
assert.equal(layerForIntel("slow"), "speed")
assert.equal(layerForIntel("control"), "control")
assert.equal(layerForIntel("crossing"), "tolls")
assert.equal(layerForIntel("fault"), null)
assert.equal(layerForIntel("weather"), null)

const parking = soloLayers(PREFERENCE_DEFAULTS.layers, "parking")
const opened = layersForIntel("incidents", parking, true)
assert.equal(opened.only, false)
assert.equal(opened.layers.parking, true)
assert.equal(opened.layers.incidents, true)
assert.equal(opened.layers.kmb, false)

const same = layersForIntel("incidents", soloLayers(PREFERENCE_DEFAULTS.layers, "incidents"), true)
assert.equal(same.only, true)
assert.equal(same.layers.incidents, true)
assert.equal(same.layers.parking, false)

const off: WatchLayers = { ...PREFERENCE_DEFAULTS.layers, incidents: false }
const enabled = layersForIntel("incidents", off, false)
assert.equal(enabled.only, false)
assert.equal(enabled.layers.incidents, true)
assert.equal(enabled.layers.speed, true)

const kept = layersForIntel("incidents", PREFERENCE_DEFAULTS.layers, false)
assert.equal(kept.layers, PREFERENCE_DEFAULTS.layers)
assert.equal(kept.only, false)

const untouched = layersForIntel(null, parking, true)
assert.equal(untouched.only, true)
assert.equal(untouched.layers, parking)

const none: WatchLayers = { ...PREFERENCE_DEFAULTS.layers }
for (const key of Object.keys(none) as (keyof WatchLayers)[]) none[key] = false
const fromEmpty = layersForIntel("tolls", none, true)
assert.equal(fromEmpty.only, false)
assert.equal(fromEmpty.layers.tolls, true)
assert.equal(fromEmpty.layers.parking, false)

console.log("intel focus ok")

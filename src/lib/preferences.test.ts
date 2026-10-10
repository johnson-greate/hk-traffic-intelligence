import assert from "node:assert/strict"
import { PREFERENCE_DEFAULTS, allLayers, allLayersOn, beginOnly, chooseWatchedLayer, intelCardOpen, layerNamesOpen, readPreferences, soleLayer, soloLayers } from "./preferences.ts"

const saved = readPreferences(JSON.stringify({
  locale: "en",
  layers: { kmb: false, ferry: false, speed: "yes" },
  basemap: "street",
  ground: "street",
  intelOpen: false,
  intelTab: "boundary",
  barOpen: false,
  pinnedOrigin: "H12",
}))
assert.equal(saved.locale, "en")
assert.equal(saved.layers.kmb, false)
assert.equal(saved.layers.ferry, false)
assert.equal(saved.layers.mtr, true)
assert.equal(saved.layers.charger, false)
assert.equal(PREFERENCE_DEFAULTS.layers.charger, false)
assert.equal(saved.basemap, "street")
assert.equal(saved.intelOpen, false)
assert.equal(saved.intelChosen, false)
assert.equal(saved.intelTab, "boundary")
assert.equal(saved.barOpen, false)
assert.equal(saved.pinnedOrigin, "H12")

assert.equal(readPreferences("not-json").locale, PREFERENCE_DEFAULTS.locale)
assert.equal(readPreferences(JSON.stringify({ locale: "fr", intelTab: "nope", basemap: "moon" })).intelTab, "ranked")
assert.equal(readPreferences(JSON.stringify({ pinnedOrigin: null })).pinnedOrigin, null)

const onlyParking = soloLayers(PREFERENCE_DEFAULTS.layers, "parking")
assert.equal(onlyParking.parking, true)
assert.equal(onlyParking.gmb, false)
assert.equal(onlyParking.kmb, false)
assert.equal(PREFERENCE_DEFAULTS.layers.gmb, true)
assert.equal(soleLayer(onlyParking), "parking")
assert.equal(soleLayer(PREFERENCE_DEFAULTS.layers), null)
const armed = beginOnly(PREFERENCE_DEFAULTS.layers)
assert.equal(soleLayer(armed), null)
assert.equal(Object.values(armed).some(Boolean), false)
assert.equal(soleLayer(beginOnly(onlyParking)), "parking")
const restored = allLayers(onlyParking)
assert.equal(restored.parking, true)
assert.equal(restored.kmb, true)
assert.equal(restored.gmb, true)
assert.equal(allLayersOn(restored), true)
assert.equal(allLayersOn(onlyParking), false)
assert.equal(onlyParking.kmb, false)
const switched = chooseWatchedLayer(true, onlyParking, "gmb")
assert.equal(switched.only, false)
assert.equal(switched.layers.parking, true)
assert.equal(switched.layers.gmb, true)
assert.equal(soleLayer(switched.layers), null)
const third = chooseWatchedLayer(false, switched.layers, "kmb")
assert.equal(third.only, false)
assert.equal(third.layers.parking, true)
assert.equal(third.layers.gmb, true)
assert.equal(third.layers.kmb, true)
const picked = chooseWatchedLayer(true, armed, "parking")
assert.equal(picked.only, true)
assert.equal(soleLayer(picked.layers), "parking")
const same = chooseWatchedLayer(true, onlyParking, "parking")
assert.equal(same.only, true)
assert.equal(soleLayer(same.layers), "parking")
const first = chooseWatchedLayer(true, PREFERENCE_DEFAULTS.layers, "parking")
assert.equal(first.only, true)
assert.equal(soleLayer(first.layers), "parking")
const plain = chooseWatchedLayer(false, onlyParking, "kmb")
assert.equal(plain.only, false)
assert.equal(plain.layers.parking, true)
assert.equal(plain.layers.kmb, true)

assert.equal(readPreferences(JSON.stringify({ intelOpen: true })).intelOpen, null)
assert.equal(readPreferences(JSON.stringify({ intelOpen: true, intelChosen: true })).intelOpen, true)
assert.equal(readPreferences(JSON.stringify({ intelOpen: false, intelChosen: true })).intelOpen, false)
assert.equal(readPreferences("{}").intelOpen, null)
assert.equal(PREFERENCE_DEFAULTS.intelOpen, null)
assert.equal(intelCardOpen(true, null), false)
assert.equal(intelCardOpen(false, null), true)
assert.equal(intelCardOpen(true, true), true)
assert.equal(intelCardOpen(true, false), false)
assert.equal(intelCardOpen(false, false), false)

assert.equal(layerNamesOpen(true, null), false)
assert.equal(layerNamesOpen(false, null), true)
assert.equal(layerNamesOpen(true, true), true)
assert.equal(layerNamesOpen(false, false), false)

console.log("preferences ok")

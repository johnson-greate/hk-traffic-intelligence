import assert from "node:assert/strict"
import { controlPointFeatures, isQueueFile, type QueueFile } from "./control-points.ts"
import { controlName } from "./i18n.ts"

const codes = ["HGP", "HYW", "HZM", "LSC", "LWS", "MKT", "SBC", "STK"]
const live = Object.fromEntries(codes.map((code) => [code, { arrQueue: 0, depQueue: 0 }])) as QueueFile
assert.equal(isQueueFile(live), true)
const withOldLokMaChau = { ...live, LMC: { arrQueue: 0, depQueue: 0 } }
delete (withOldLokMaChau as { HGP?: unknown }).HGP
assert.equal(isQueueFile(withOldLokMaChau), false)

const features = controlPointFeatures(live, live)
const names = features.map((feature) => feature.properties?.code)
assert.equal(names.includes("HGP"), true)
assert.equal(names.includes("LMC"), false)
assert.equal(names.includes("LSC"), true)
assert.equal(controlName("zh-HK", "HGP", "Huanggang"), "皇崗")
assert.equal(controlName("zh-HK", "LSC", "Lok Ma Chau Spur Line"), "落馬洲支線")
assert.equal(controlName("en", "HGP", "Huanggang"), "Huanggang")
const huanggang = features.find((feature) => feature.properties?.code === "HGP")
const spur = features.find((feature) => feature.properties?.code === "LSC")
assert.deepEqual(huanggang?.geometry?.type === "Point" ? huanggang.geometry.coordinates : null, [114.06773, 22.52319])
assert.deepEqual(spur?.geometry?.type === "Point" ? spur.geometry.coordinates : null, [114.0655, 22.5143])

console.log("control points ok")

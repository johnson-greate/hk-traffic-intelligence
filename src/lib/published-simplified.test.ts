import assert from "node:assert/strict"
import { displayText, ensureSimplified, publishedSimplified } from "./i18n.ts"

assert.equal(publishedSimplified("机场 经 屯门赤\u{2B6AD}角隧道"), "机场 经 屯门赤鱲角隧道")
assert.equal(publishedSimplified("湾仔 经 香港仔隧道"), "湾仔 经 香港仔隧道")

await ensureSimplified()
assert.equal(
  displayText("zh-CN", "機場 經 屯門赤鱲角隧道", "Airport via Tuen Mun Chek Lap Kok Tunnel"),
  "机场 经 屯门赤鱲角隧道",
)
assert.equal(displayText("zh-CN", "灣仔 經 香港仔隧道", "Wan Chai via Aberdeen Tunnel"), "湾仔 经 香港仔隧道")
assert.equal(displayText("zh-HK", "機場 經 屯門赤鱲角隧道", "Airport via Tuen Mun Chek Lap Kok Tunnel"), "機場 經 屯門赤鱲角隧道")
assert.equal(displayText("en", "機場 經 屯門赤鱲角隧道", "Airport via Tuen Mun Chek Lap Kok Tunnel"), "Airport via Tuen Mun Chek Lap Kok Tunnel")

console.log("published simplified ok")

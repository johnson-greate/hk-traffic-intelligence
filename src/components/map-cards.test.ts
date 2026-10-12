import assert from "node:assert/strict"
import { MESSAGES } from "../lib/i18n.ts"
import { chargerPopup, corridorPopup, kerbPopup, meterPopup, parkingPopup } from "./map-cards.ts"

type Node = {
  className: string
  textContent: string
  children: Node[]
  style: Record<string, string>
  append: (...items: Node[]) => void
  replaceChildren: (...items: Node[]) => void
  isConnected: boolean
  addEventListener: () => void
}

function createElement(): Node {
  const node: Node = {
    className: "",
    textContent: "",
    children: [],
    style: {},
    isConnected: true,
    addEventListener() {},
    append(...items) {
      node.children.push(...items)
    },
    replaceChildren(...items) {
      node.children = items
    },
  }
  return node
}

const documentStub = { createElement }
Object.assign(globalThis, { document: documentStub })

function kindOf(card: Node): string {
  const head = card.children[0]
  const kind = head?.children.find((child) => child.className === "city-card-kind")
  return kind?.textContent ?? ""
}

function titleOf(card: Node): string {
  const head = card.children[0]
  const title = head?.children.find((child) => child.className === "city-card-title")
  return title?.textContent ?? ""
}

const spaces = JSON.stringify([{ id: "1", kind: "general", vacant: true, updated: "10/05/2026 06:46:59 PM" }])
const enMeter = meterPopup({ streetEn: "Nathan Road", streetTc: "彌敦道", spaces }, MESSAGES.en) as unknown as Node
assert.equal(kindOf(enMeter), "Meters")
assert.equal(titleOf(enMeter), "Nathan Road")
const hkMeter = meterPopup({ streetEn: "Nathan Road", streetTc: "彌敦道", spaces }, MESSAGES["zh-HK"]) as unknown as Node
assert.equal(kindOf(hkMeter), "咪錶")
const scMeter = meterPopup({ streetEn: "Nathan Road", streetTc: "彌敦道", spaces }, MESSAGES["zh-CN"]) as unknown as Node
assert.equal(kindOf(scMeter), "咪表")

const park = parkingPopup({ nameEn: "Airside", nameTc: "Airside" }, MESSAGES.en) as unknown as Node
assert.equal(kindOf(park), "Car parks")
const bikes = parkingPopup({ nameEn: "Bay", nameTc: "灣", motorcycle: 3 }, MESSAGES["zh-HK"]) as unknown as Node
assert.equal(kindOf(bikes), "電單車")
const charger = chargerPopup({ nameEn: "Plaza", nameTc: "廣場" }, MESSAGES.en) as unknown as Node
assert.equal(kindOf(charger), "Chargers")
const kerb = kerbPopup({ streetEn: "Queen's Road", streetTc: "皇后大道" }, MESSAGES.en) as unknown as Node
assert.equal(kindOf(kerb), "Motorcycle bays")
const speed = corridorPopup({ name: "Connaught Road" }, MESSAGES.en) as unknown as Node
assert.equal(kindOf(speed), "Speed")

console.log("card kind ok")

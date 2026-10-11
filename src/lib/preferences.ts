import { localeOf, type Locale } from "./i18n.ts"
import type { Basemap, WatchLayer, WatchLayers } from "./types.ts"

const KEY = "hk-traffic-preferences"

const LAYER_IDS: readonly WatchLayer[] = [
  "speed",
  "cameras",
  "works",
  "tolls",
  "incidents",
  "control",
  "mtr",
  "lrt",
  "kmb",
  "citybus",
  "gmb",
  "nlb",
  "mtrbus",
  "ferry",
  "parking",
  "motorcycle",
  "kerb",
  "meter",
  "charger",
]

const TABS = ["ranked", "roads", "boundary", "weather", "systems", "notes"] as const

export type IntelTabPreference = (typeof TABS)[number]

export type Preferences = {
  locale: Locale
  layers: WatchLayers
  basemap: Basemap
  ground: Exclude<Basemap, "buildings">
  intelOpen: boolean | null
  intelChosen: boolean
  intelTab: IntelTabPreference
  barOpen: boolean
  pinnedOrigin: string | null
}

export const PREFERENCE_DEFAULTS: Preferences = {
  locale: "zh-HK",
  layers: {
    speed: true,
    cameras: true,
    works: true,
    tolls: true,
    incidents: true,
    control: true,
    mtr: true,
    lrt: true,
    kmb: true,
    citybus: true,
    gmb: true,
    nlb: true,
    mtrbus: true,
    ferry: true,
    parking: true,
    motorcycle: true,
    kerb: false,
    meter: true,
    charger: false,
  },
  basemap: "satellite",
  ground: "satellite",
  intelOpen: null,
  intelChosen: false,
  intelTab: "ranked",
  barOpen: true,
  pinnedOrigin: null,
}

const listeners = new Set<() => void>()
let current = PREFERENCE_DEFAULTS
let serverSnapshot: Preferences = PREFERENCE_DEFAULTS
let loaded = false

export function noteServerLocale(locale: Locale) {
  if (serverSnapshot.locale === locale) return
  serverSnapshot = { ...PREFERENCE_DEFAULTS, locale }
}

export function readPreferences(raw: string | null, fallback: Preferences = PREFERENCE_DEFAULTS): Preferences {
  if (!raw) return fallback
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fallback
  }
  if (typeof parsed !== "object" || parsed === null) return fallback
  const row = parsed as Record<string, unknown>
  const ground = row.ground === "street" || row.ground === "satellite" ? row.ground : fallback.ground
  return {
    locale: localeOf(typeof row.locale === "string" ? row.locale : fallback.locale),
    layers: readLayers(row.layers, fallback.layers),
    basemap: isBasemap(row.basemap) ? row.basemap : fallback.basemap,
    ground,
    intelOpen: readIntelOpen(row, fallback.intelOpen),
    intelChosen: row.intelChosen === true,
    intelTab: isTab(row.intelTab) ? row.intelTab : fallback.intelTab,
    barOpen: typeof row.barOpen === "boolean" ? row.barOpen : fallback.barOpen,
    pinnedOrigin: row.pinnedOrigin === null ? null : typeof row.pinnedOrigin === "string" && row.pinnedOrigin ? row.pinnedOrigin : fallback.pinnedOrigin,
  }
}

export function preferenceSnapshot(): Preferences {
  ensureLoaded()
  return current
}

export function preferenceServerSnapshot(): Preferences {
  return serverSnapshot
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function updatePreference(patch: Partial<Preferences> | ((current: Preferences) => Partial<Preferences>)): void {
  ensureLoaded()
  const nextPatch = typeof patch === "function" ? patch(current) : patch
  const next = readPreferences(JSON.stringify({ ...current, ...nextPatch }), current)
  if (JSON.stringify(next) === JSON.stringify(current)) return
  current = next
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(current))
    } catch {
      // A private browser can refuse the write. The choice still applies for this visit.
    }
  }
  for (const listener of listeners) listener()
}

export function storedPreferenceRaw(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function ensureLoaded(): void {
  if (loaded || typeof window === "undefined") return
  loaded = true
  const raw = storedPreferenceRaw()
  current = raw ? readPreferences(raw) : { ...PREFERENCE_DEFAULTS, locale: serverSnapshot.locale }
}

export function allLayers(layers: WatchLayers): WatchLayers {
  const next = { ...layers }
  for (const key of LAYER_IDS) next[key] = true
  return next
}

export function allLayersOn(layers: WatchLayers): boolean {
  return LAYER_IDS.every((id) => layers[id])
}

export function soloLayers(layers: WatchLayers, id: WatchLayer): WatchLayers {
  const next = { ...layers }
  for (const key of LAYER_IDS) next[key] = key === id
  return next
}

export function beginOnly(layers: WatchLayers): WatchLayers {
  if (soleLayer(layers)) return layers
  const next = { ...layers }
  for (const key of LAYER_IDS) next[key] = false
  return next
}

export const INTEL_PHONE_QUERY = "(max-width: 639px)"

export function intelCardOpen(phone: boolean, choice: boolean | null): boolean {
  if (choice !== null) return choice
  return !phone
}

export function layerNamesOpen(narrow: boolean, choice: boolean | null): boolean {
  if (choice !== null) return choice
  return !narrow
}

export function chooseWatchedLayer(only: boolean, layers: WatchLayers, id: WatchLayer): { only: boolean; layers: WatchLayers } {
  if (!only) return { only: false, layers: { ...layers, [id]: !layers[id] } }
  const current = soleLayer(layers)
  if (current && current !== id) return { only: false, layers: { ...layers, [id]: true } }
  return { only: true, layers: soloLayers(layers, id) }
}

export function soleLayer(layers: WatchLayers): WatchLayer | null {
  let found: WatchLayer | null = null
  for (const id of LAYER_IDS) {
    if (!layers[id]) continue
    if (found) return null
    found = id
  }
  return found
}

function readLayers(value: unknown, fallback: WatchLayers): WatchLayers {
  const source = typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
  const layers = { ...fallback }
  for (const id of LAYER_IDS) {
    if (typeof source[id] === "boolean") layers[id] = source[id]
  }
  return layers
}

function isBasemap(value: unknown): value is Basemap {
  return value === "satellite" || value === "street" || value === "buildings"
}

function readIntelOpen(row: Record<string, unknown>, fallback: boolean | null): boolean | null {
  if (row.intelChosen === true && typeof row.intelOpen === "boolean") return row.intelOpen
  if (row.intelOpen === false) return false
  if (row.intelOpen === true || row.intelOpen === null) return null
  return fallback
}

function isTab(value: unknown): value is IntelTabPreference {
  return typeof value === "string" && TABS.some((tab) => tab === value)
}

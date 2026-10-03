"use client"

import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/components/locale"
import type { Messages } from "@/lib/i18n"
import type { Basemap, WatchLayer, WatchLayers } from "@/lib/types"

type LayerDockProps = {
  layers: WatchLayers
  basemap: Basemap
  counts: Record<WatchLayer, number | null>
  onToggle: (layer: WatchLayer) => void
  onBasemap: (basemap: Basemap) => void
  onReplay: () => void
  mapLive: boolean
  pictureError: string | null
  mtrError: string | null
  kmbError: string | null
  lrtError: string | null
  citybusError: string | null
  aboveMarquee: boolean
}

const SPEED_KEY = [
  { color: "#3DDC97", key: "good" },
  { color: "#FFC857", key: "average" },
  { color: "#FF5D73", key: "bad" },
] as const

function layerLabel(id: WatchLayer, m: Messages): string {
  switch (id) {
    case "speed":
      return m.speedLayer
    case "cameras":
      return m.cameras
    case "works":
      return m.worksLayer
    case "tolls":
      return m.tolls
    case "incidents":
      return m.incidentsLayer
    case "control":
      return m.boundary
    case "mtr":
      return m.mtr
    case "kmb":
      return m.kmbLwb
    case "lrt":
      return m.lrt
    case "citybus":
      return m.citybus
    default: {
      const exhaustive: never = id
      return exhaustive
    }
  }
}

function basemapLabel(id: Basemap, m: Messages): string {
  switch (id) {
    case "satellite":
      return m.satellite
    case "street":
      return m.streets
    case "buildings":
      return m.buildings
    default: {
      const exhaustive: never = id
      return exhaustive
    }
  }
}

const BASEMAPS: Basemap[] = ["satellite", "street", "buildings"]
const LAYERS: { id: WatchLayer; swatch: string }[] = [
  { id: "speed", swatch: "bg-[#3DDC97]" },
  { id: "cameras", swatch: "bg-[#7DD3E8]" },
  { id: "works", swatch: "bg-[#FF5D73]" },
  { id: "tolls", swatch: "bg-[#E7FBFF]" },
  { id: "incidents", swatch: "bg-[#FF5D73]" },
  { id: "control", swatch: "bg-[#D7B4FF]" },
  { id: "mtr", swatch: "bg-[#E2231A]" },
  { id: "lrt", swatch: "bg-[#f5c518]" },
  { id: "kmb", swatch: "bg-[#9f1239]" },
  { id: "citybus", swatch: "bg-[#f6c343]" },
]

export function LayerDock(props: LayerDockProps) {
  const { messages: m } = useI18n()
  const [layersOpen, setLayersOpen] = useState(false)
  const dock = useRef<HTMLDivElement>(null)
  const { mapLive } = props
  // On phones the intel panel stacks above the dock, so publish how much of the screen bottom the dock takes.
  useEffect(() => {
    const node = dock.current
    if (!mapLive || !node) return
    const root = document.documentElement
    const apply = () => {
      const parent = node.offsetParent?.getBoundingClientRect()
      if (!parent || window.matchMedia("(min-width: 640px)").matches) {
        root.style.removeProperty("--layer-dock-clear")
        return
      }
      root.style.setProperty("--layer-dock-clear", `${Math.ceil(parent.bottom - node.getBoundingClientRect().top + 8)}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(node)
    window.addEventListener("resize", apply)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", apply)
      root.style.removeProperty("--layer-dock-clear")
    }
  }, [mapLive])
  if (!mapLive) return null
  const activeCount = LAYERS.filter((layer) => props.layers[layer.id]).length
  return (
    <div
      ref={dock}
      data-map-chrome="bottom"
      className={`pointer-events-auto absolute left-4 z-10 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 lg:left-16 ${
        props.aboveMarquee ? "bottom-30 sm:bottom-28" : "bottom-30 sm:bottom-14 lg:max-w-[calc(100%-30rem)]"
      }`}
    >
      <div className="inline-flex border border-white/15" role="group" aria-label={m.basemap}>
        {BASEMAPS.map((id) => {
          const on = props.basemap === id
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => props.onBasemap(id)}
              className={`px-2.5 py-1.5 font-[family-name:var(--font-hud)] text-[0.72rem] tracking-[0.08em] uppercase ${
                on ? "bg-[#041018]/80 text-white" : "bg-[#041018]/55 text-zinc-400"
              }`}
            >
              {basemapLabel(id, m)}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        aria-expanded={layersOpen}
        aria-controls="layer-toggles"
        onClick={() => setLayersOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 font-[family-name:var(--font-hud)] text-[0.72rem] tracking-[0.08em] uppercase sm:hidden ${
          layersOpen ? "border-cyan-200/50 bg-[#041018]/80 text-white" : "border-white/15 bg-[#041018]/70 text-cyan-50"
        }`}
      >
        {m.layers}
        <span className="text-cyan-100/70 tabular-nums">
          {activeCount}/{LAYERS.length}
        </span>
        <span aria-hidden="true">{layersOpen ? "▾" : "▴"}</span>
      </button>
      <div
        id="layer-toggles"
        role="group"
        aria-label={m.layers}
        className={`${layersOpen ? "flex" : "hidden"} basis-full gap-2 overflow-x-auto max-sm:order-1 sm:contents`}
      >
        {LAYERS.map((layer) => {
          const on = props.layers[layer.id]
          const count = props.counts[layer.id]
          return (
            <button
              key={layer.id}
              type="button"
              aria-pressed={on}
              onClick={() => props.onToggle(layer.id)}
              className={`inline-flex items-center gap-2 border px-2.5 py-1.5 font-[family-name:var(--font-hud)] text-[0.72rem] tracking-[0.08em] uppercase max-sm:shrink-0 max-sm:whitespace-nowrap ${
                on
                  ? "border-cyan-200/50 bg-[#041018]/80 text-white"
                  : "border-white/15 bg-[#041018]/55 text-zinc-400"
              }`}
            >
              <span className={`size-2 rounded-full ${layer.swatch} ${on ? "" : "opacity-35"}`} />
              {layerLabel(layer.id, m)}
              {count == null ? "" : ` ${count}`}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={props.onReplay}
        className="border border-white/15 bg-[#041018]/70 px-2.5 py-1.5 font-[family-name:var(--font-hud)] text-[0.72rem] tracking-[0.08em] text-cyan-50 uppercase"
      >
        {m.replay}
      </button>
      {props.layers.speed ? (
        <p
          className="basis-full flex flex-wrap items-center gap-x-3 gap-y-1 font-[family-name:var(--font-hud)] text-[0.68rem] tracking-[0.06em] text-cyan-50/90 uppercase max-sm:order-2"
          aria-label={m.speedKey}
        >
          {SPEED_KEY.map((band) => (
            <span key={band.key} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full" style={{ background: band.color }} />
              {m[band.key]}
            </span>
          ))}
        </p>
      ) : null}
      {props.pictureError ? (
        <p className="basis-full text-xs text-red-100" role="alert">
          {m.locale === "en" ? props.pictureError : m.pictureFailed}
        </p>
      ) : null}
      {props.mtrError ? (
        <p className="basis-full text-xs text-red-100" role="alert">
          {m.locale === "en" ? props.mtrError : m.mtrFailed}
        </p>
      ) : null}
      {props.lrtError ? (
        <p className="basis-full text-xs text-red-100" role="alert">
          {m.locale === "en" ? props.lrtError : m.lrtFailed}
        </p>
      ) : null}
      {props.citybusError ? (
        <p className="basis-full text-xs text-red-100" role="alert">
          {m.locale === "en" ? props.citybusError : m.citybusFailed}
        </p>
      ) : null}
      {props.kmbError ? (
        <p className="basis-full text-xs text-red-100" role="alert">
          {m.locale === "en" ? props.kmbError : m.kmbFailed}
        </p>
      ) : null}
    </div>
  )
}

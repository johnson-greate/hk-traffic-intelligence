import { soleLayer } from "./preferences.ts"
import type { IntelKind } from "./intel.ts"
import type { WatchLayer, WatchLayers } from "./types.ts"

export function layerForIntel(kind: IntelKind): WatchLayer | null {
  switch (kind) {
    case "incident":
      return "incidents"
    case "works":
      return "works"
    case "jam":
    case "slow":
      return "speed"
    case "control":
      return "control"
    case "crossing":
      return "tolls"
    case "fault":
    case "weather":
      return null
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

export function layersForIntel(layer: WatchLayer | null, layers: WatchLayers, only: boolean): { layers: WatchLayers; only: boolean } {
  if (!layer) return { layers, only }
  if (only && soleLayer(layers) === layer) return { layers, only: true }
  if (only) return { only: false, layers: { ...layers, [layer]: true } }
  if (layers[layer]) return { layers, only: false }
  return { layers: { ...layers, [layer]: true }, only: false }
}

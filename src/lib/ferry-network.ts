import piersFile from "../../data/ferry-piers.json"
import type { FerryResponse } from "@/lib/types"

type PierRecord = { id: string; nameTc: string; nameEn: string; lng: number; lat: number }
const piers = (piersFile as { piers: PierRecord[] }).piers

export function ferryPiers(): PierRecord[] {
  return piers
}

export function ferryPierFeatures(clock: FerryResponse | null): GeoJSON.FeatureCollection {
  const calls = new Map((clock?.ok ? clock.piers : []).map((pier) => [pier.id, pier.calls]))
  return {
    type: "FeatureCollection",
    features: piers.map((pier) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [pier.lng, pier.lat] },
      properties: {
        nameTc: pier.nameTc,
        nameEn: pier.nameEn,
        routes: JSON.stringify([]),
        board: JSON.stringify(calls.get(pier.id) ?? []),
      },
    })),
  }
}

export function ferryVesselFeatures(clock: FerryResponse | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: (clock?.ok ? clock.vessels : []).map((vessel) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [vessel.lng, vessel.lat] },
      properties: {
        nameTc: vessel.nameTc,
        nameEn: vessel.nameEn,
        routes: JSON.stringify(vessel.route ? [vessel.route] : []),
        board: JSON.stringify([{
          route: vessel.route,
          destTc: vessel.nameTc,
          destEn: vessel.nameEn,
          eta: vessel.eta,
          minutes: null,
          remarkTc: "",
          remarkEn: "",
          scheduled: false,
        }]),
      },
    })),
  }
}

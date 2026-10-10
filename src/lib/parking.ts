import { fetchUpstream } from "@/lib/upstream"
import { kmbReachMetres } from "@/lib/kmb-reach"
import { collapseSameSites, oneStopCount, parkLists, parseOneStopParks, parseOneStopSpaces, parksNear, soloParkingRadiusMetres, type ParkingPark, type ParkingSpace } from "@/lib/parking-parks"

export type ParkingPlace = ParkingPark & { cars: number | null }
export type ParkingPlacesResponse = { ok: true; parks: ParkingPlace[] } | { ok: false; error?: string; parks: ParkingPlace[] }
export type MotorcyclePark = ParkingPark & { motorcycle: number }
export type MotorcyclePlacesResponse = { ok: true; parks: MotorcyclePark[] } | { ok: false; error?: string; parks: MotorcyclePark[] }
export type ParkReadingResponse =
  | { ok: true; parks: ParkingPlace[]; motorcycles: MotorcyclePark[] }
  | { ok: false; error?: string; parks: ParkingPlace[]; motorcycles: MotorcyclePark[] }

const ONE_STOP = "https://api.data.gov.hk/v1/carpark-info-vacancy"
const INFO_ZH = `${ONE_STOP}?data=info&lang=zh_TW`
const INFO_EN = `${ONE_STOP}?data=info&lang=en_US`
const VACANCY_URL = `${ONE_STOP}?data=vacancy&vehicleTypes=privateCar,LGV,HGV,motorCycle&lang=zh_TW`
const INFO_MS = 12 * 60 * 60 * 1000
const VACANCY_MS = 60_000
export const PARKING_POLL_MS = VACANCY_MS
const WIDE_CAP = 600

export async function loadParkReading(
  lng: number,
  lat: number,
  zoom = Number.NaN,
  wide = false,
): Promise<{ ok: true; parks: ParkingPlace[]; motorcycles: MotorcyclePark[] } | { ok: false }> {
  const [parks, vacancy] = await Promise.all([catalogue(), readJson(VACANCY_URL, VACANCY_MS)])
  if (!parks) return { ok: false }
  const listed = parkLists(
    parks,
    vacancy ? oneStopCount(vacancy, "privateCar") : new Map<string, number>(),
    vacancy ? oneStopCount(vacancy, "motorCycle") : new Map<string, number>(),
  )
  const radius = wide ? soloParkingRadiusMetres(zoom, lat) : kmbReachMetres(zoom, lat)
  const cap = wide ? WIDE_CAP : undefined
  return {
    ok: true,
    parks: parksNear(listed.parks, lng, lat, radius, cap),
    motorcycles: parksNear(listed.motorcycles, lng, lat, radius, cap),
  }
}

export async function loadParkingVacancy(id: string): Promise<{ ok: true; spaces: ParkingSpace[] } | { ok: false }> {
  const body = await readJson(VACANCY_URL, VACANCY_MS)
  if (!body) return { ok: false }
  return { ok: true, spaces: parseOneStopSpaces(body, id) }
}

async function catalogue(): Promise<ParkingPark[] | null> {
  const [chinese, english] = await Promise.all([readJson(INFO_ZH, INFO_MS), readJson(INFO_EN, INFO_MS)])
  if (!chinese) return null
  return collapseSameSites(parseOneStopParks(chinese, english))
}

async function readJson(url: string, ttlMs: number): Promise<unknown | null> {
  try {
    const response = await fetchUpstream(url, ttlMs)
    if (response.status !== 200) return null
    const text = new TextDecoder().decode(response.body).replace(/^\uFEFF/, "")
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

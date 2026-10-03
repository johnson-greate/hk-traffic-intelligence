import { loadFerrySnapshot } from "@/lib/ferry-feed"
import type { FerryResponse } from "@/lib/types"

export const dynamic = "force-dynamic"

const FRESH_MS = 60_000

let pending: Promise<FerryResponse> | null = null
let cached: { at: number; body: FerryResponse } | null = null

export async function GET() {
  const now = Date.now()
  if (cached && now - cached.at < FRESH_MS) return Response.json(cached.body)
  pending ??= loadFerrySnapshot(now).finally(() => {
    pending = null
  })
  try {
    const body = await pending
    if (body.ok) cached = { at: Date.now(), body }
    else if (cached) return Response.json(cached.body)
    return Response.json(body, { status: body.ok ? 200 : 502 })
  } catch (error) {
    if (cached) return Response.json(cached.body)
    const body: FerryResponse = {
      ok: false,
      error: error instanceof Error ? error.message : "Ferry arrivals failed",
      observedAt: null,
      piers: [],
      vessels: [],
    }
    return Response.json(body, { status: 502 })
  }
}

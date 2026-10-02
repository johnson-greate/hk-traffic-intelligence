import { ensureSchema, readHistory, type HistoryDb, type HistoryRow } from "@/lib/history-store"

export const dynamic = "force-dynamic"

const HOUR_MS = 3_600_000
const MAX_HOURS = 48

type HistoryResponse = { ok: boolean; error?: string; hours: number; snapshots: HistoryRow[] }

export async function GET(request: Request) {
  const asked = Number(new URL(request.url).searchParams.get("hours") ?? 24)
  const hours = Number.isFinite(asked) ? Math.min(MAX_HOURS, Math.max(1, Math.round(asked))) : 24
  const db = await historyDb()
  if (!db) {
    const body: HistoryResponse = { ok: false, error: "History is stored in Cloudflare D1; run npm run dev:vinext", hours, snapshots: [] }
    return Response.json(body, { status: 503 })
  }
  try {
    // The first request can arrive before the first cron tick has made the table.
    await ensureSchema(db)
    const snapshots = await readHistory(db, Date.now() - hours * HOUR_MS)
    const body: HistoryResponse = { ok: true, hours, snapshots }
    return Response.json(body, { headers: { "Cache-Control": "public, max-age=60" } })
  } catch (error) {
    const body: HistoryResponse = { ok: false, error: error instanceof Error ? error.message : "History failed", hours, snapshots: [] }
    return Response.json(body, { status: 502 })
  }
}

// The Node dev server (npm run dev) has no Cloudflare bindings, so the module may not exist there.
async function historyDb(): Promise<HistoryDb | null> {
  try {
    const { env } = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "cloudflare:workers")) as { env: { DB?: HistoryDb } }
    return env.DB ?? null
  } catch {
    return null
  }
}

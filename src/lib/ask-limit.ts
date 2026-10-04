import type { HistoryDb } from "./history-store.ts"

// The question box's rate limit, counted in D1 so every Worker instance shares it:
// an in-memory count only held within one instance.

const SCHEMA = `CREATE TABLE IF NOT EXISTS ask_hits (visitor TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ask_hits_visitor_at ON ask_hits (visitor, at)`

// Rows older than this are deleted as questions come in, so the table stays small.
const KEEP_MS = 60 * 60_000
const DAY_MS = 86_400_000

export async function allowQuestion(db: HistoryDb, visitor: string, now: number, max: number, windowMs: number): Promise<boolean> {
  await db.exec(SCHEMA)
  await db.prepare("DELETE FROM ask_hits WHERE at < ?").bind(now - KEEP_MS).run()
  const { results } = await db.prepare("SELECT COUNT(*) AS n FROM ask_hits WHERE visitor = ? AND at > ?").bind(visitor, now - windowMs).all<{ n: number }>()
  if ((results[0]?.n ?? 0) >= max) return false
  await db.prepare("INSERT INTO ask_hits (visitor, at) VALUES (?, ?)").bind(visitor, now).run()
  return true
}

// A hash of the visitor's IP for the current day: no address is stored, and keys from
// different days cannot be linked.
export async function visitorKey(ip: string, now: number): Promise<string> {
  const day = Math.floor(now / DAY_MS)
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hktraffic-ask:${day}:${ip}`))
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

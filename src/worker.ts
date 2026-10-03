// The Cloudflare Worker: vinext serves the site, and a cron tick stores a snapshot.
import site from "vinext/server/fetch-handler"
import type { HistoryDb } from "@/lib/history-store"
import { recordSnapshot } from "@/lib/record-snapshot"

export * from "vinext/server/fetch-handler"

type Env = { DB: HistoryDb }
type Context = { waitUntil(promise: Promise<unknown>): void }

const worker = {
  ...site,
  async scheduled(_controller: unknown, env: Env, ctx: Context) {
    const load = (path: string) => site.fetch(new Request(`https://snapshot.internal${path}`), env, ctx)
    console.log("snapshot start")
    try {
      console.log("snapshot", JSON.stringify(await recordSnapshot(env.DB, load)))
    } catch (error) {
      console.error("snapshot failed", error instanceof Error ? error.message : String(error))
      throw error
    }
  },
}

export default worker

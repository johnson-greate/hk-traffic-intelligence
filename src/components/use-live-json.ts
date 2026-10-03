"use client"

import { useEffect, useState } from "react"
import { nextReading } from "@/lib/last-reading"

export function useLiveJson<T extends { ok: boolean }>(url: string | null, intervalMs = 60_000): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false
    let generation = 0

    const load = async () => {
      const request = ++generation
      try {
        const response = await fetch(url, { cache: "no-store" })
        const body: unknown = await response.json()
        if (cancelled || request !== generation) return
        if (!hasOk(body)) {
          setError(`Unexpected response (${response.status})`)
          return
        }
        const incoming = body as T
        setData((current) => nextReading(current, incoming))
        setError(incoming.ok ? null : readingError(incoming, response.status))
      } catch (cause) {
        if (cancelled || request !== generation) return
        setError(cause instanceof Error ? cause.message : "Request failed")
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [intervalMs, url])

  if (!url) return { data: null, error: null }
  return { data, error }
}

function readingError(body: { ok: boolean }, status: number): string {
  if ("error" in body && typeof body.error === "string" && body.error) return body.error
  return `Feed failed (${status})`
}

function hasOk(value: unknown): value is { ok: boolean } {
  if (typeof value !== "object" || value === null || !("ok" in value)) return false
  return typeof value.ok === "boolean"
}

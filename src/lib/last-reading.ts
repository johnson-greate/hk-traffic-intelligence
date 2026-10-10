export function nextReading<T extends { ok: boolean }>(current: T | null, incoming: T): T {
  if (incoming.ok) return incoming
  if (current?.ok) return current
  return incoming
}

export function scheduleLiveRead(running: boolean, latest: string | null): "wait" | "fetch" | "stop" {
  if (!latest) return "stop"
  if (running) return "wait"
  return "fetch"
}

export function continueLiveRead(fetched: string | null, latest: string | null): boolean {
  return fetched !== latest
}

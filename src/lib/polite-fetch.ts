export function politeQueue(limit: number) {
  let active = 0
  const waiting: Array<() => void> = []
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => {
        waiting.push(resolve)
      })
    }
    active += 1
    try {
      return await task()
    } finally {
      active -= 1
      waiting.shift()?.()
    }
  }
}

// One isolate shares this queue, so several map views cannot open a burst of ETA calls together.
export const etaQueue = politeQueue(6)

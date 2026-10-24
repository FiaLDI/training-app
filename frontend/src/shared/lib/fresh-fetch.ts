const FRESH_MS = 20_000
const lastAt = new Map<string, number>()
const inflight = new Map<string, Promise<void>>()

export function skipFreshFetch(key: string, hasData: boolean): boolean {
  if (!hasData) return false
  const at = lastAt.get(key)
  return at != null && Date.now() - at < FRESH_MS
}

export function markFetched(key: string) {
  lastAt.set(key, Date.now())
}

export function coalesceFetch(key: string, run: () => Promise<void>): Promise<void> {
  const existing = inflight.get(key)
  if (existing) return existing
  const promise = run().finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

export function resetFreshFetch() {
  lastAt.clear()
  inflight.clear()
}

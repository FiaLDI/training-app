export const CACHE_PORT = 'CACHE_PORT'

export interface CounterResult {
  /** Value after increment. */
  count: number
  /** Seconds until the counter window expires. */
  ttlSeconds: number
}

/**
 * Shared state store (cache, revocation lists, rate-limit counters).
 *
 * Implementations must never throw: an unavailable backend degrades to a miss
 * (`get` → null, `set`/`del` → no-op) so request handling keeps working.
 * `increment` is the exception — it must stay correct even without Redis,
 * otherwise rate limiting would silently fail open.
 */
export interface CachePort {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  del(key: string): Promise<void>
  /** Atomic INCR with a TTL applied only when the window starts. */
  increment(key: string, windowSeconds: number): Promise<CounterResult>
  /** True when the primary (Redis) backend is serving requests. */
  isHealthy(): boolean
}

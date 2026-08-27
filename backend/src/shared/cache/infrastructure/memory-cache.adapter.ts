import { OnModuleDestroy } from '@nestjs/common'

import { CachePort, CounterResult } from '../core/ports/cache.port'

type Entry = {
  value: unknown
  expiresAt: number
}

const SWEEP_INTERVAL_MS = 60_000

/**
 * Process-local CachePort used when Redis is not configured and as the fallback
 * while Redis is unreachable. Correct for a single backend instance; counters
 * and revocations are lost on restart, so it is a safety net, not a target state.
 */
export class MemoryCacheAdapter implements CachePort, OnModuleDestroy {
  private readonly store = new Map<string, Entry>()
  private readonly sweeper: NodeJS.Timeout

  /** Bounds memory when keys are attacker-controlled (rate-limit keys by IP). */
  constructor(private readonly maxEntries = 50_000) {
    this.sweeper = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS)
    this.sweeper.unref()
  }

  onModuleDestroy(): void {
    clearInterval(this.sweeper)
    this.store.clear()
  }

  get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return Promise.resolve(null)
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return Promise.resolve(null)
    }
    return Promise.resolve(entry.value as T)
  }

  set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.evictIfNeeded()
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
    return Promise.resolve()
  }

  del(key: string): Promise<void> {
    this.store.delete(key)
    return Promise.resolve()
  }

  increment(key: string, windowSeconds: number): Promise<CounterResult> {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || entry.expiresAt <= now) {
      this.evictIfNeeded()
      this.store.set(key, { value: 1, expiresAt: now + windowSeconds * 1000 })
      return Promise.resolve({ count: 1, ttlSeconds: windowSeconds })
    }

    const count = (entry.value as number) + 1
    entry.value = count
    return Promise.resolve({
      count,
      ttlSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
    })
  }

  isHealthy(): boolean {
    return false
  }

  private sweep(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key)
    }
  }

  private evictIfNeeded(): void {
    if (this.store.size < this.maxEntries) return
    this.sweep()
    // Map preserves insertion order, so the first keys are the oldest writes.
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next()
      if (oldest.done) return
      this.store.delete(oldest.value)
    }
  }
}

import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import Redis, { RedisOptions } from 'ioredis'

import { CachePort, CounterResult } from '../core/ports/cache.port'
import { MemoryCacheAdapter } from './memory-cache.adapter'

const MAX_RECONNECT_DELAY_MS = 10_000
/** ioredis emits `error` on every reconnect attempt; throttle to keep logs readable. */
const ERROR_LOG_INTERVAL_MS = 30_000

/** Constructed by CacheModule's factory, not by Nest DI (takes a plain URL string). */
export class RedisCacheAdapter implements CachePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheAdapter.name)
  private readonly client: Redis
  private ready = false
  private lastErrorLoggedAt = 0

  constructor(
    url: string,
    private readonly fallback: MemoryCacheAdapter,
  ) {
    const options: RedisOptions = {
      lazyConnect: true,
      // Fail commands immediately instead of queueing them while disconnected —
      // a queued command would stall the request it belongs to.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      retryStrategy: (times) => Math.min(times * 500, MAX_RECONNECT_DELAY_MS),
    }

    this.client = new Redis(url, options)

    this.client.on('ready', () => {
      this.ready = true
      this.logger.log('Redis connected')
    })
    this.client.on('end', () => {
      this.ready = false
    })
    this.client.on('error', (error: Error) => {
      this.ready = false
      this.logError(error)
    })
  }

  onModuleInit(): void {
    // Not awaited: an unreachable Redis must not block application startup.
    void this.client.connect().catch((error: Error) => this.logError(error))
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    }
  }

  isHealthy(): boolean {
    return this.ready
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.ready) return this.fallback.get<T>(key)

    try {
      const raw = await this.client.get(key)
      if (raw === null) return null
      return JSON.parse(raw) as T
    } catch (error) {
      this.logError(error as Error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.ready) return this.fallback.set(key, value, ttlSeconds)

    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (error) {
      this.logError(error as Error)
    }
  }

  async del(key: string): Promise<void> {
    // Also clear the fallback copy so a Redis outage cannot resurrect stale data.
    await this.fallback.del(key)
    if (!this.ready) return

    try {
      await this.client.del(key)
    } catch (error) {
      this.logError(error as Error)
    }
  }

  async increment(key: string, windowSeconds: number): Promise<CounterResult> {
    if (!this.ready) return this.fallback.increment(key, windowSeconds)

    try {
      const result = await this.client
        .multi()
        .incr(key)
        .expire(key, windowSeconds, 'NX')
        .ttl(key)
        .exec()

      const count = Number(result?.[0]?.[1] ?? 0)
      const ttl = Number(result?.[2]?.[1] ?? windowSeconds)
      if (!count) throw new Error('Empty INCR reply')

      return { count, ttlSeconds: ttl > 0 ? ttl : windowSeconds }
    } catch (error) {
      this.logError(error as Error)
      // Counting in memory keeps the limiter enforcing instead of failing open.
      return this.fallback.increment(key, windowSeconds)
    }
  }

  private logError(error: Error): void {
    const now = Date.now()
    if (now - this.lastErrorLoggedAt < ERROR_LOG_INTERVAL_MS) return
    this.lastErrorLoggedAt = now
    this.logger.warn(`Redis unavailable, using in-memory fallback: ${error.message}`)
  }
}

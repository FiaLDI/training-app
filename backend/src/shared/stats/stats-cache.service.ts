import { Inject, Injectable } from '@nestjs/common'

import { CACHE_PORT, CachePort } from '../cache/core/ports/cache.port'

const GEN_TTL_SECONDS = 86400 * 365
const COMPLETED_PERIOD_TTL_SECONDS = 86400 * 7

export type SyncCollection = 'trainings' | 'templates' | 'programs' | 'exercises'

export type SyncState = {
  trainings: number
  templates: number
  programs: number
  exercises: number
  stats: number
}

@Injectable()
export class StatsCacheService {
  constructor(@Inject(CACHE_PORT) private readonly cache: CachePort) {}

  private genKey(userId: string): string {
    return `stats:${userId}:gen`
  }

  private collectionGenKey(userId: string, collection: SyncCollection): string {
    return `sync:${userId}:${collection}:gen`
  }

  private async generation(userId: string): Promise<number> {
    return (await this.cache.get<number>(this.genKey(userId))) ?? 0
  }

  async getCollectionGeneration(userId: string, collection: SyncCollection): Promise<number> {
    return (await this.cache.get<number>(this.collectionGenKey(userId, collection))) ?? 0
  }

  async bumpCollection(userId: string, collection: SyncCollection): Promise<void> {
    const gen = await this.getCollectionGeneration(userId, collection)
    await this.cache.set(this.collectionGenKey(userId, collection), gen + 1, GEN_TTL_SECONDS)
  }

  async getSyncState(userId: string): Promise<SyncState> {
    const [trainings, templates, programs, exercises, stats] = await Promise.all([
      this.getCollectionGeneration(userId, 'trainings'),
      this.getCollectionGeneration(userId, 'templates'),
      this.getCollectionGeneration(userId, 'programs'),
      this.getCollectionGeneration(userId, 'exercises'),
      this.generation(userId),
    ])
    return { trainings, templates, programs, exercises, stats }
  }

  cacheKey(userId: string, type: string, periodKey: string, gen: number): string {
    return `stats:${userId}:${gen}:${type}:${periodKey}`
  }

  periodKey(from: string, to: string): string {
    return `${from.slice(0, 10)}:${to.slice(0, 10)}`
  }

  isPeriodCompleted(to: string): boolean {
    const end = new Date(to)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return end < today
  }

  async get<T>(userId: string, type: string, periodKey: string): Promise<T | null> {
    const gen = await this.generation(userId)
    return this.cache.get<T>(this.cacheKey(userId, type, periodKey, gen))
  }

  async set<T>(userId: string, type: string, periodKey: string, value: T): Promise<void> {
    const gen = await this.generation(userId)
    await this.cache.set(
      this.cacheKey(userId, type, periodKey, gen),
      value,
      COMPLETED_PERIOD_TTL_SECONDS,
    )
  }

  async invalidateUser(userId: string): Promise<void> {
    const gen = await this.generation(userId)
    await this.cache.set(this.genKey(userId), gen + 1, GEN_TTL_SECONDS)
  }
}

export { COMPLETED_PERIOD_TTL_SECONDS }

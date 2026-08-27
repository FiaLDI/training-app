import { Global, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CACHE_PORT, CachePort } from './core/ports/cache.port'
import { MemoryCacheAdapter } from './infrastructure/memory-cache.adapter'
import { RedisCacheAdapter } from './infrastructure/redis-cache.adapter'

function resolveRedisUrl(config: ConfigService): string | null {
  const url = config.get<string>('REDIS_URL')?.trim()
  if (url) return url

  const host = config.get<string>('REDIS_HOST')?.trim()
  if (!host) return null

  const port = config.get<string>('REDIS_PORT')?.trim() || '6379'
  const password = config.get<string>('REDIS_PASSWORD')?.trim()
  const auth = password ? `:${encodeURIComponent(password)}@` : ''
  return `redis://${auth}${host}:${port}`
}

@Global()
@Module({
  providers: [
    {
      // Factory, not a class provider: the constructor takes a plain number
      // (max entries) that Nest would otherwise try to resolve as a dependency.
      provide: MemoryCacheAdapter,
      useFactory: () => new MemoryCacheAdapter(),
    },
    {
      provide: CACHE_PORT,
      inject: [ConfigService, MemoryCacheAdapter],
      useFactory: (config: ConfigService, fallback: MemoryCacheAdapter): CachePort => {
        const url = resolveRedisUrl(config)
        if (!url) {
          new Logger('CacheModule').warn(
            'REDIS_URL/REDIS_HOST not set — using in-memory cache (single instance only)',
          )
          return fallback
        }
        return new RedisCacheAdapter(url, fallback)
      },
    },
  ],
  exports: [CACHE_PORT],
})
export class CacheModule {}

import { SetMetadata } from '@nestjs/common'

export const RATE_LIMIT_METADATA = 'RATE_LIMIT_METADATA'

export interface RateLimitOptions {
  /** Allowed requests per window from a single client. */
  limit: number
  windowSeconds: number
  /** Key namespace; defaults to `controller.handler`. */
  name?: string
}

/** Per-IP request limit for a route, backed by the shared CachePort. */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA, options)

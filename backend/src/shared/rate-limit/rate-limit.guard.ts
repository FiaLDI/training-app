import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request, Response } from 'express'

import { CACHE_PORT, CachePort } from '../cache/core/ports/cache.port'
import { RATE_LIMIT_METADATA, RateLimitOptions } from './rate-limit.decorator'

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name)

  constructor(
    private readonly reflector: Reflector,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    )
    if (!options) return true

    const http = context.switchToHttp()
    const request = http.getRequest<Request>()
    const name =
      options.name ?? `${context.getClass().name}.${context.getHandler().name}`
    const key = `rl:${name}:${this.clientIp(request)}`

    const { count, ttlSeconds } = await this.cache.increment(key, options.windowSeconds)

    const response = http.getResponse<Response>()
    response.setHeader('RateLimit-Limit', options.limit)
    response.setHeader('RateLimit-Remaining', Math.max(0, options.limit - count))
    response.setHeader('RateLimit-Reset', ttlSeconds)

    if (count > options.limit) {
      response.setHeader('Retry-After', ttlSeconds)
      this.logger.warn(`Rate limit exceeded for ${key} (${count}/${options.limit})`)
      throw new HttpException(
        'Too many requests, please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    return true
  }

  /**
   * Requires `trust proxy` on the Express app; without it every request behind
   * nginx would share the container IP and therefore a single bucket.
   */
  private clientIp(request: Request): string {
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown'
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip
  }
}

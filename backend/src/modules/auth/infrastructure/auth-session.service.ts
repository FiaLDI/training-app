import { createHash } from 'crypto'

import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CACHE_PORT, CachePort } from '../../../shared/cache/core/ports/cache.port'
import {
  AUTH_REPOSITORY_PORT,
  AuthRepositoryPort,
} from '../core/ports/auth-repository.port'
import { User } from '../core/types'
import { TOKEN_TTL_SECONDS, VerifiedJwtPayload } from './jwt-token.service'

const DEFAULT_USER_CACHE_TTL_SECONDS = 300

@Injectable()
export class AuthSessionService {
  private readonly userCacheTtl: number

  constructor(
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    @Inject(AUTH_REPOSITORY_PORT) private readonly authRepository: AuthRepositoryPort,
    config: ConfigService,
  ) {
    const configured = Number(config.get<string>('AUTH_USER_CACHE_TTL_SECONDS'))
    this.userCacheTtl =
      Number.isFinite(configured) && configured > 0
        ? configured
        : DEFAULT_USER_CACHE_TTL_SECONDS
  }

  async getCachedUser(userId: string): Promise<User | null> {
    return this.cache.get<User>(this.userKey(userId))
  }

  async cacheUser(user: User): Promise<void> {
    await this.cache.set(this.userKey(user.id), user, this.userCacheTtl)
  }

  /** Call after any change to a user's profile or role so it is not served stale. */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.del(this.userKey(userId))
  }

  /**
   * Invalidates every token issued to the user (login-code reset).
   * Persists `sessions_revoked_at` so revocation survives a Redis outage,
   * and mirrors the cutoff into Redis for the hot path.
   */
  async revokeAllSessions(userId: string): Promise<void> {
    const at = new Date()
    const cutoff = Math.floor(at.getTime() / 1000)
    await this.authRepository.revokeSessionsAt(userId, at)
    await this.cache.set(this.revokedAtKey(userId), cutoff, TOKEN_TTL_SECONDS)
    await this.invalidateUser(userId)
  }

  /** Revokes a single token (logout) for its remaining lifetime. */
  async revokeToken(token: string, payload: VerifiedJwtPayload): Promise<void> {
    const remaining = payload.exp - Math.floor(Date.now() / 1000)
    if (remaining <= 0) return
    await this.cache.set(this.revokedTokenKey(token), 1, remaining)
  }

  async isRevoked(token: string, payload: VerifiedJwtPayload, user?: User | null): Promise<boolean> {
    const revokedToken = await this.cache.get<number>(this.revokedTokenKey(token))
    if (revokedToken) return true

    const cutoff = await this.cache.get<number>(this.revokedAtKey(payload.sub))
    if (cutoff !== null && payload.iat < cutoff) return true

    if (user?.sessionsRevokedAt) {
      const durableCutoff = Math.floor(Date.parse(user.sessionsRevokedAt) / 1000)
      if (Number.isFinite(durableCutoff) && payload.iat < durableCutoff) return true
    }

    return false
  }

  private userKey(userId: string): string {
    return `auth:user:${userId}`
  }

  private revokedAtKey(userId: string): string {
    return `auth:revoked-at:${userId}`
  }

  private revokedTokenKey(token: string): string {
    return `auth:revoked-token:${createHash('sha256').update(token).digest('hex')}`
  }
}

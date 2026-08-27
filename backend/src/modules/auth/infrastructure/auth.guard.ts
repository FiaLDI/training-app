import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'

import { AuthRepositoryPort, AUTH_REPOSITORY_PORT } from '../core/ports/auth-repository.port'
import { User } from '../core/types'
import { AuthSessionService } from './auth-session.service'
import { extractAccessToken } from './extract-access-token'
import { JwtTokenService, VerifiedJwtPayload } from './jwt-token.service'

export type AuthenticatedRequest = Request & {
  user?: User
  /** Raw bearer/cookie token, kept so logout can revoke exactly this session. */
  accessToken?: string
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly authSession: AuthSessionService,
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepository: AuthRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = extractAccessToken(request)
    if (!token) {
      throw new UnauthorizedException('Authentication required')
    }

    let payload: VerifiedJwtPayload
    try {
      payload = this.jwtTokenService.verify(token)
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }

    const user = await this.resolveUser(payload.sub)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    if (await this.authSession.isRevoked(token, payload, user)) {
      throw new UnauthorizedException('Session has been revoked')
    }

    request.user = user
    request.accessToken = token
    return true
  }

  /** Cache hit here removes a DB round-trip from every authenticated request. */
  private async resolveUser(userId: string): Promise<User | null> {
    const cached = await this.authSession.getCachedUser(userId)
    if (cached) return cached

    const user = await this.authRepository.findUserById(userId)
    if (user) await this.authSession.cacheUser(user)
    return user
  }
}

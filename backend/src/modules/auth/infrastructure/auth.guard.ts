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
import { JwtTokenService } from './jwt-token.service'

export type AuthenticatedRequest = Request & {
  user?: User
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtTokenService: JwtTokenService,
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepository: AuthRepositoryPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractToken(request)
    if (!token) {
      throw new UnauthorizedException('Authentication required')
    }

    try {
      const payload = this.jwtTokenService.verify(token)
      const user = await this.authRepository.findUserById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }
      request.user = user
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization
    if (header?.startsWith('Bearer ')) {
      return header.slice(7)
    }

    const cookieHeader = request.headers.cookie
    if (cookieHeader) {
      const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('access_token='))
      if (match) {
        return decodeURIComponent(match.slice('access_token='.length))
      }
    }

    return null
  }
}

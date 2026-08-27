import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

export type JwtPayload = {
  sub: string
  email: string
}

/** `iat`/`exp` are always present on a verified token; revocation checks rely on them. */
export type VerifiedJwtPayload = JwtPayload & {
  iat: number
  exp: number
}

export const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60

@Injectable()
export class JwtTokenService {
  constructor(private readonly config: ConfigService) {}

  private get secret(): string {
    return this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me'
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: TOKEN_TTL_SECONDS })
  }

  verify(token: string): VerifiedJwtPayload {
    return jwt.verify(token, this.secret) as VerifiedJwtPayload
  }
}

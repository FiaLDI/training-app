import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

export type JwtPayload = {
  sub: string
  email: string
}

@Injectable()
export class JwtTokenService {
  constructor(private readonly config: ConfigService) {}

  private get secret(): string {
    return this.config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me'
  }

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '30d' })
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload
  }
}

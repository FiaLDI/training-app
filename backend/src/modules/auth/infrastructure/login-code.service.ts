import { createHmac } from 'crypto'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'

import { generateAuthCode } from '../core/lib/generate-auth-code'

const BCRYPT_ROUNDS = 12
const CODE_LENGTH = 12

/**
 * Login codes are never stored in plaintext.
 * - `lookupKey`: deterministic HMAC-SHA256 for indexed lookup (pepper = LOGIN_CODE_PEPPER).
 * - `hash` / `verify`: bcrypt for the actual credential check.
 */
@Injectable()
export class LoginCodeService {
  private readonly pepper: string

  constructor(config: ConfigService) {
    this.pepper =
      config.get<string>('LOGIN_CODE_PEPPER')?.trim() ||
      config.get<string>('JWT_SECRET')?.trim() ||
      'dev-pepper-change-me'
  }

  generate(): string {
    return generateAuthCode(CODE_LENGTH)
  }

  /** Indexed lookup key — never use the bcrypt hash for WHERE clauses. */
  lookupKey(code: string): string {
    return createHmac('sha256', this.pepper).update(code.trim()).digest('hex')
  }

  hash(code: string): Promise<string> {
    return bcrypt.hash(code.trim(), BCRYPT_ROUNDS)
  }

  verify(code: string, hash: string): Promise<boolean> {
    return bcrypt.compare(code.trim(), hash)
  }
}

import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { CachePort } from '../../../../../shared/cache/core/ports/cache.port'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { JwtTokenService } from '../../../infrastructure/jwt-token.service'
import { LoginCodeService } from '../../../infrastructure/login-code.service'
import { LoginInput } from './interfaces/login.input'
import { LoginOutput } from './interfaces/login.output'

const ACCOUNT_LIMIT = 5
const ACCOUNT_WINDOW_SECONDS = 900

export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly jwtTokenService: JwtTokenService,
    private readonly loginCodes: LoginCodeService,
    private readonly cache: CachePort,
  ) {}

  public async execute(input: LoginInput): Promise<LoginOutput> {
    const code = input.code.trim()
    const lookup = this.loginCodes.lookupKey(code)
    const user = await this.authRepository.findUserWithCredentialsByLookup(lookup)

    if (user) {
      const { count } = await this.cache.increment(
        this.accountLimitKey(user.id),
        ACCOUNT_WINDOW_SECONDS,
      )
      if (count > ACCOUNT_LIMIT) {
        throw new HttpException(
          'Too many login attempts for this account, please try again later',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
    }

    const valid = user ? await this.loginCodes.verify(code, user.loginCodeHash) : false
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid code')
    }

    await this.cache.del(this.accountLimitKey(user.id))
    await this.authRepository.touchLastLogin(user.id)

    const accessToken = this.jwtTokenService.sign({
      sub: user.id,
      email: user.email,
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        metadata: user.metadata,
        createdAt: user.createdAt,
      },
      accessToken,
    }
  }

  private accountLimitKey(userId: string): string {
    return `rl:auth-login-user:${userId}`
  }
}

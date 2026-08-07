import { UnauthorizedException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { JwtTokenService } from '../../../infrastructure/jwt-token.service'
import { LoginInput } from './interfaces/login.input'
import { LoginOutput } from './interfaces/login.output'

export class LoginUseCase implements UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  public async execute(input: LoginInput): Promise<LoginOutput> {
    const code = input.code.trim()
    const user = await this.authRepository.findUserByLoginCode(code)
    if (!user) {
      throw new UnauthorizedException('Invalid code')
    }

    const accessToken = this.jwtTokenService.sign({
      sub: user.id,
      email: user.email,
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        metadata: user.metadata,
        createdAt: user.createdAt,
      },
      accessToken,
    }
  }
}

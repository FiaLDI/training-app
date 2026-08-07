import { Logger } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { generateAuthCode } from '../../lib/generate-auth-code'
import { RegisterInput } from './interfaces/register.input'
import { RegisterOutput } from './interfaces/register.output'

export class RegisterUseCase implements UseCase<RegisterInput, RegisterOutput> {
  private readonly logger = new Logger(RegisterUseCase.name)

  constructor(private readonly authRepository: AuthRepositoryPort) {}

  public async execute(input: RegisterInput): Promise<RegisterOutput> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.authRepository.findUserByEmail(email)

    if (existing) {
      this.logger.log(`Permanent login code for ${email}: ${existing.loginCode}`)
      return {
        email: existing.email,
        created: false,
      }
    }

    const loginCode = await this.createUniqueLoginCode()
    const username = email.split('@')[0] || 'user'
    const user = await this.authRepository.createUser({
      email,
      username,
      loginCode,
    })

    this.logger.log(`Permanent login code for ${email}: ${loginCode}`)

    return {
      email: user.email,
      created: true,
    }
  }

  private async createUniqueLoginCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateAuthCode(8)
      const taken = await this.authRepository.findUserByLoginCode(code)
      if (!taken) return code
    }
    throw new Error('Failed to generate unique login code')
  }
}

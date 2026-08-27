import { Logger } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { LoginCodeService } from '../../../infrastructure/login-code.service'
import { RegisterInput } from './interfaces/register.input'
import { RegisterOutput } from './interfaces/register.output'

export class RegisterUseCase implements UseCase<RegisterInput, RegisterOutput> {
  private readonly logger = new Logger(RegisterUseCase.name)

  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly loginCodes: LoginCodeService,
  ) {}

  public async execute(input: RegisterInput): Promise<RegisterOutput> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.authRepository.findUserByEmail(email)

    if (existing) {
      // Plaintext is gone — cannot re-show. Admin must reset.
      return {
        email: existing.email,
        created: false,
      }
    }

    const { plaintext, hash, lookup } = await this.createUniqueCodeMaterial()
    const username = email.split('@')[0] || 'user'
    const user = await this.authRepository.createUser({
      email,
      username,
      loginCodeHash: hash,
      loginCodeLookup: lookup,
    })

    this.logger.log(`Registered user ${user.email} (login code issued once in API response)`)

    return {
      email: user.email,
      created: true,
      loginCode: plaintext,
    }
  }

  private async createUniqueCodeMaterial(): Promise<{
    plaintext: string
    hash: string
    lookup: string
  }> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const plaintext = this.loginCodes.generate()
      const lookup = this.loginCodes.lookupKey(plaintext)
      if (await this.authRepository.isLoginLookupTaken(lookup)) continue
      const hash = await this.loginCodes.hash(plaintext)
      return { plaintext, hash, lookup }
    }
    throw new Error('Failed to generate unique login code')
  }
}

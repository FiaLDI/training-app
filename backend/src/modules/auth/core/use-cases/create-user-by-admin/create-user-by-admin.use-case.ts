import { ConflictException, Logger } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { LoginCodeService } from '../../../infrastructure/login-code.service'

export type CreateUserByAdminInput = {
  email: string
}

export type CreateUserByAdminOutput = {
  id: string
  email: string
  username: string
  /** Shown once to the admin — copy and deliver out-of-band. */
  loginCode: string
}

export class CreateUserByAdminUseCase
  implements UseCase<CreateUserByAdminInput, CreateUserByAdminOutput>
{
  private readonly logger = new Logger(CreateUserByAdminUseCase.name)

  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly loginCodes: LoginCodeService,
  ) {}

  public async execute(input: CreateUserByAdminInput): Promise<CreateUserByAdminOutput> {
    const email = input.email.trim().toLowerCase()
    const existing = await this.authRepository.findUserByEmail(email)
    if (existing) {
      throw new ConflictException('User with this email already exists')
    }

    let plaintext = ''
    let lookup = ''
    let hash = ''
    for (let attempt = 0; attempt < 10; attempt += 1) {
      plaintext = this.loginCodes.generate()
      lookup = this.loginCodes.lookupKey(plaintext)
      if (await this.authRepository.isLoginLookupTaken(lookup)) continue
      hash = await this.loginCodes.hash(plaintext)
      break
    }
    if (!hash) throw new Error('Failed to generate unique login code')

    const username = email.split('@')[0] || 'user'
    const user = await this.authRepository.createUser({
      email,
      username,
      loginCodeHash: hash,
      loginCodeLookup: lookup,
    })

    this.logger.log(`Admin created user ${user.email} (login code issued once)`)

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      loginCode: plaintext,
    }
  }
}

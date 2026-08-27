import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { AuthSessionService } from '../../../infrastructure/auth-session.service'
import { LoginCodeService } from '../../../infrastructure/login-code.service'

export type ResetLoginCodeInput = {
  userId: string
  actorUserId: string
}

export type ResetLoginCodeOutput = {
  id: string
  email: string
  /** Shown once to the admin — previous code and sessions are invalidated. */
  loginCode: string
}

export class ResetLoginCodeUseCase
  implements UseCase<ResetLoginCodeInput, ResetLoginCodeOutput>
{
  private readonly logger = new Logger(ResetLoginCodeUseCase.name)

  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly loginCodes: LoginCodeService,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(input: ResetLoginCodeInput): Promise<ResetLoginCodeOutput> {
    if (input.userId === input.actorUserId) {
      throw new ForbiddenException('Нельзя сбросить собственный код входа')
    }

    const user = await this.authRepository.findUserById(input.userId)
    if (!user) throw new NotFoundException('User not found')

    let plaintext = this.loginCodes.generate()
    let lookup = this.loginCodes.lookupKey(plaintext)
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (!(await this.authRepository.isLoginLookupTaken(lookup, user.id))) break
      plaintext = this.loginCodes.generate()
      lookup = this.loginCodes.lookupKey(plaintext)
    }

    const hash = await this.loginCodes.hash(plaintext)
    await this.authRepository.updateLoginCode(user.id, {
      loginCodeHash: hash,
      loginCodeLookup: lookup,
    })
    await this.authSession.revokeAllSessions(user.id)

    this.logger.log(`Admin reset login code for ${user.email}; sessions revoked`)

    return {
      id: user.id,
      email: user.email,
      loginCode: plaintext,
    }
  }
}

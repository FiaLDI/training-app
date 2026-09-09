import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthSessionService } from '../../../infrastructure/auth-session.service'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'

export type DeleteUserByAdminInput = {
  userId: string
}

export type DeleteUserByAdminOutput = {
  ok: true
}

export class DeleteUserByAdminUseCase
  implements UseCase<DeleteUserByAdminInput, DeleteUserByAdminOutput>
{
  private readonly logger = new Logger(DeleteUserByAdminUseCase.name)

  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(input: DeleteUserByAdminInput): Promise<DeleteUserByAdminOutput> {
    const user = await this.authRepository.findUserById(input.userId)
    if (!user) throw new NotFoundException('Пользователь не найден')
    if (user.role === 'admin') {
      throw new ForbiddenException('Нельзя удалить администратора')
    }

    await this.authSession.revokeAllSessions(user.id)
    await this.authRepository.deleteUser(user.id)
    this.logger.log(`Admin deleted user ${user.email}`)

    return { ok: true }
  }
}

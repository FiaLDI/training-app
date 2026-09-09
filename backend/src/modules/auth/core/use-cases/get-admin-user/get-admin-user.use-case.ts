import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { User } from '../../types'

export type GetAdminUserInput = {
  userId: string
}

export type GetAdminUserOutput = Pick<
  User,
  'id' | 'email' | 'username' | 'role' | 'createdAt' | 'lastLoginAt'
>

export class GetAdminUserUseCase
  implements UseCase<GetAdminUserInput, GetAdminUserOutput>
{
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  public async execute(input: GetAdminUserInput): Promise<GetAdminUserOutput> {
    const user = await this.authRepository.findUserById(input.userId)
    if (!user) throw new NotFoundException('Пользователь не найден')

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }
  }
}

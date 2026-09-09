import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { AuthSessionService } from '../../../infrastructure/auth-session.service'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { User } from '../../types'

export type UpdateUserByAdminInput = {
  userId: string
  email?: string
  username?: string
}

export type UpdateUserByAdminOutput = Pick<
  User,
  'id' | 'email' | 'username' | 'role' | 'createdAt' | 'lastLoginAt'
>

export class UpdateUserByAdminUseCase
  implements UseCase<UpdateUserByAdminInput, UpdateUserByAdminOutput>
{
  private readonly logger = new Logger(UpdateUserByAdminUseCase.name)

  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly authSession: AuthSessionService,
  ) {}

  public async execute(input: UpdateUserByAdminInput): Promise<UpdateUserByAdminOutput> {
    const emailProvided = input.email !== undefined
    const usernameProvided = input.username !== undefined
    if (!emailProvided && !usernameProvided) {
      throw new BadRequestException('Укажите email или username')
    }

    const user = await this.authRepository.findUserById(input.userId)
    if (!user) throw new NotFoundException('Пользователь не найден')

    const email = emailProvided ? input.email!.trim().toLowerCase() : user.email
    const username = usernameProvided ? input.username!.trim() : user.username

    if (!email) throw new BadRequestException('Email не может быть пустым')
    if (!username) throw new BadRequestException('Имя пользователя не может быть пустым')

    if (email !== user.email) {
      const existing = await this.authRepository.findUserByEmail(email)
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Пользователь с таким email уже существует')
      }
    }

    const updated = await this.authRepository.updateUserProfile(user.id, {
      email,
      username,
    })
    if (!updated) throw new NotFoundException('Пользователь не найден')

    await this.authSession.invalidateUser(user.id)
    this.logger.log(`Admin updated user ${updated.email}`)

    return {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      createdAt: updated.createdAt,
      lastLoginAt: updated.lastLoginAt,
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'

import { AuthSessionService } from '../../../infrastructure/auth-session.service'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { UpdateUserByAdminUseCase } from './update-user-by-admin.use-case'

describe('UpdateUserByAdminUseCase', () => {
  const user = {
    id: 'user-1',
    email: 'a@example.com',
    username: 'alice',
    role: 'user' as const,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    sessionsRevokedAt: null,
  }

  let authRepository: jest.Mocked<
    Pick<AuthRepositoryPort, 'findUserById' | 'findUserByEmail' | 'updateUserProfile'>
  >
  let authSession: jest.Mocked<Pick<AuthSessionService, 'invalidateUser'>>
  let useCase: UpdateUserByAdminUseCase

  beforeEach(() => {
    authRepository = {
      findUserById: jest.fn(),
      findUserByEmail: jest.fn(),
      updateUserProfile: jest.fn(),
    }
    authSession = {
      invalidateUser: jest.fn().mockResolvedValue(undefined),
    }
    useCase = new UpdateUserByAdminUseCase(
      authRepository as unknown as AuthRepositoryPort,
      authSession as unknown as AuthSessionService,
    )
  })

  it('rejects when neither email nor username is provided', async () => {
    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(authRepository.findUserById).not.toHaveBeenCalled()
  })

  it('rejects when the user is missing', async () => {
    authRepository.findUserById.mockResolvedValue(null)

    await expect(
      useCase.execute({ userId: 'missing', email: 'b@example.com' }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('rejects when the new email belongs to another user', async () => {
    authRepository.findUserById.mockResolvedValue(user)
    authRepository.findUserByEmail.mockResolvedValue({
      ...user,
      id: 'user-2',
      email: 'taken@example.com',
    })

    await expect(
      useCase.execute({ userId: 'user-1', email: 'taken@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(authRepository.updateUserProfile).not.toHaveBeenCalled()
  })

  it('rejects an empty username after trim', async () => {
    authRepository.findUserById.mockResolvedValue(user)

    await expect(
      useCase.execute({ userId: 'user-1', username: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('updates email and username, then invalidates cache', async () => {
    const updated = {
      ...user,
      email: 'b@example.com',
      username: 'bob',
    }
    authRepository.findUserById.mockResolvedValue(user)
    authRepository.findUserByEmail.mockResolvedValue(null)
    authRepository.updateUserProfile.mockResolvedValue(updated)

    const result = await useCase.execute({
      userId: 'user-1',
      email: '  B@Example.com ',
      username: ' bob ',
    })

    expect(authRepository.updateUserProfile).toHaveBeenCalledWith('user-1', {
      email: 'b@example.com',
      username: 'bob',
    })
    expect(authSession.invalidateUser).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({
      id: 'user-1',
      email: 'b@example.com',
      username: 'bob',
      role: 'user',
      createdAt: user.createdAt,
      lastLoginAt: null,
    })
  })

  it('skips uniqueness check when email is unchanged', async () => {
    authRepository.findUserById.mockResolvedValue(user)
    authRepository.updateUserProfile.mockResolvedValue({
      ...user,
      username: 'alice2',
    })

    await useCase.execute({ userId: 'user-1', username: 'alice2' })

    expect(authRepository.findUserByEmail).not.toHaveBeenCalled()
    expect(authRepository.updateUserProfile).toHaveBeenCalledWith('user-1', {
      email: 'a@example.com',
      username: 'alice2',
    })
  })
})

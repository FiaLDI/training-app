import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { AuthSessionService } from '../../../infrastructure/auth-session.service'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { DeleteUserByAdminUseCase } from './delete-user-by-admin.use-case'

describe('DeleteUserByAdminUseCase', () => {
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

  let authRepository: jest.Mocked<Pick<AuthRepositoryPort, 'findUserById' | 'deleteUser'>>
  let authSession: jest.Mocked<Pick<AuthSessionService, 'revokeAllSessions'>>
  let useCase: DeleteUserByAdminUseCase

  beforeEach(() => {
    authRepository = {
      findUserById: jest.fn(),
      deleteUser: jest.fn().mockResolvedValue(undefined),
    }
    authSession = {
      revokeAllSessions: jest.fn().mockResolvedValue(undefined),
    }
    useCase = new DeleteUserByAdminUseCase(
      authRepository as unknown as AuthRepositoryPort,
      authSession as unknown as AuthSessionService,
    )
  })

  it('rejects when the user is missing', async () => {
    authRepository.findUserById.mockResolvedValue(null)

    await expect(useCase.execute({ userId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(authRepository.deleteUser).not.toHaveBeenCalled()
  })

  it('rejects deleting an admin', async () => {
    authRepository.findUserById.mockResolvedValue({ ...user, role: 'admin' })

    await expect(useCase.execute({ userId: 'user-1' })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
    expect(authSession.revokeAllSessions).not.toHaveBeenCalled()
    expect(authRepository.deleteUser).not.toHaveBeenCalled()
  })

  it('revokes sessions and deletes a regular user', async () => {
    authRepository.findUserById.mockResolvedValue(user)

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({ ok: true })

    expect(authSession.revokeAllSessions).toHaveBeenCalledWith('user-1')
    expect(authRepository.deleteUser).toHaveBeenCalledWith('user-1')
  })
})

import { HttpException, UnauthorizedException } from '@nestjs/common'

import { CachePort } from '../../../../../shared/cache/core/ports/cache.port'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { JwtTokenService } from '../../../infrastructure/jwt-token.service'
import { LoginCodeService } from '../../../infrastructure/login-code.service'
import { LoginUseCase } from './login.use-case'

describe('LoginUseCase', () => {
  const user = {
    id: 'user-1',
    email: 'a@example.com',
    username: 'alice',
    role: 'user' as const,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    sessionsRevokedAt: null,
    loginCodeHash: 'hash',
    loginCodeLookup: 'lookup-key',
  }

  let authRepository: jest.Mocked<Pick<AuthRepositoryPort, 'findUserWithCredentialsByLookup' | 'touchLastLogin'>>
  let jwtTokenService: jest.Mocked<Pick<JwtTokenService, 'sign'>>
  let loginCodes: jest.Mocked<Pick<LoginCodeService, 'lookupKey' | 'verify'>>
  let cache: jest.Mocked<Pick<CachePort, 'increment' | 'del'>>
  let useCase: LoginUseCase

  beforeEach(() => {
    authRepository = {
      findUserWithCredentialsByLookup: jest.fn(),
      touchLastLogin: jest.fn(),
    }
    jwtTokenService = {
      sign: jest.fn().mockReturnValue('jwt-token'),
    }
    loginCodes = {
      lookupKey: jest.fn().mockReturnValue('lookup-key'),
      verify: jest.fn(),
    }
    cache = {
      increment: jest.fn().mockResolvedValue({ count: 1, ttlSeconds: 900 }),
      del: jest.fn().mockResolvedValue(undefined),
    }
    useCase = new LoginUseCase(
      authRepository as unknown as AuthRepositoryPort,
      jwtTokenService as unknown as JwtTokenService,
      loginCodes as unknown as LoginCodeService,
      cache as unknown as CachePort,
    )
  })

  it('rejects invalid code when user is not found', async () => {
    authRepository.findUserWithCredentialsByLookup.mockResolvedValue(null)

    await expect(useCase.execute({ code: 'bad-code' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
    expect(cache.increment).not.toHaveBeenCalled()
  })

  it('rejects invalid code when verification fails', async () => {
    authRepository.findUserWithCredentialsByLookup.mockResolvedValue(user)
    loginCodes.verify.mockResolvedValue(false)

    await expect(useCase.execute({ code: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rate-limits repeated attempts for a known account', async () => {
    authRepository.findUserWithCredentialsByLookup.mockResolvedValue(user)
    loginCodes.verify.mockResolvedValue(false)
    cache.increment.mockResolvedValue({ count: 6, ttlSeconds: 900 })

    await expect(useCase.execute({ code: 'wrong' })).rejects.toBeInstanceOf(HttpException)
  })

  it('returns user and token on successful login', async () => {
    authRepository.findUserWithCredentialsByLookup.mockResolvedValue(user)
    loginCodes.verify.mockResolvedValue(true)

    const result = await useCase.execute({ code: ' valid-code ' })

    expect(loginCodes.lookupKey).toHaveBeenCalledWith('valid-code')
    expect(cache.del).toHaveBeenCalledWith('rl:auth-login-user:user-1')
    expect(authRepository.touchLastLogin).toHaveBeenCalledWith('user-1')
    expect(result.accessToken).toBe('jwt-token')
    expect(result.user.id).toBe('user-1')
  })
})

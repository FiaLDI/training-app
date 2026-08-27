import { User, UserWithCredentials } from '../types'

export interface CreateUserRepositoryInput {
  email: string
  username: string
  loginCodeHash: string
  loginCodeLookup: string
  metadata?: Record<string, unknown>
  role?: 'user' | 'admin'
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<User | null>
  findUserById(id: string): Promise<User | null>
  findUserWithCredentialsByLookup(lookup: string): Promise<UserWithCredentials | null>
  findUserWithCredentialsById(id: string): Promise<UserWithCredentials | null>
  createUser(input: CreateUserRepositoryInput): Promise<User>
  updateLoginCode(
    userId: string,
    input: { loginCodeHash: string; loginCodeLookup: string },
  ): Promise<void>
  touchLastLogin(userId: string): Promise<void>
  revokeSessionsAt(userId: string, at: Date): Promise<void>
  listUsers(): Promise<User[]>
  isLoginLookupTaken(lookup: string, exceptUserId?: string): Promise<boolean>
}

export const AUTH_REPOSITORY_PORT = Symbol('AUTH_REPOSITORY_PORT')

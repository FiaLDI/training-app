import { User } from '../types'

export interface CreateUserRepositoryInput {
  email: string
  username: string
  loginCode: string
  metadata?: Record<string, unknown>
}

export interface AuthRepositoryPort {
  findUserByEmail(email: string): Promise<User | null>
  findUserById(id: string): Promise<User | null>
  findUserByLoginCode(loginCode: string): Promise<User | null>
  createUser(input: CreateUserRepositoryInput): Promise<User>
}

export const AUTH_REPOSITORY_PORT = Symbol('AUTH_REPOSITORY_PORT')

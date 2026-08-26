import type { AuthUser } from '../types'

export const AUTH_PORT = Symbol('AUTH_PORT')

export interface AuthPort {
  requireAdmin(accessToken: string): Promise<AuthUser>
}

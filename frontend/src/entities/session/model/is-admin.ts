import type { AuthUser } from '../api/auth-api'

export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === 'admin'
}

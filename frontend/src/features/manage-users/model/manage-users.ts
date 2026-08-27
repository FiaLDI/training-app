import { authApi, type AdminUser, type IssuedLoginCode } from '@/entities/session/api/auth-api'

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { users } = await authApi.listUsers()
  return users
}

export async function createAdminUser(email: string): Promise<IssuedLoginCode> {
  return authApi.createUser(email)
}

export async function resetAdminUserCode(userId: string): Promise<IssuedLoginCode> {
  return authApi.resetLoginCode(userId)
}

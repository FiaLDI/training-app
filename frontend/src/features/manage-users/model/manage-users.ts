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

export async function getAdminUser(userId: string): Promise<AdminUser> {
  return authApi.getUser(userId)
}

export async function updateAdminUser(
  userId: string,
  input: { email?: string; username?: string },
): Promise<AdminUser> {
  return authApi.updateUser(userId, input)
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await authApi.deleteUser(userId)
}

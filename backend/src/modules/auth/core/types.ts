export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  loginCode: string
  role: UserRole
  metadata: Record<string, unknown>
  createdAt: string
}

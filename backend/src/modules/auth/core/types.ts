export interface User {
  id: string
  email: string
  username: string
  loginCode: string
  metadata: Record<string, unknown>
  createdAt: string
}

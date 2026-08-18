export interface LoginOutput {
  user: {
    id: string
    email: string
    username: string
    role: 'user' | 'admin'
    metadata: Record<string, unknown>
    createdAt: string
  }
  accessToken: string
}

export interface LoginOutput {
  user: {
    id: string
    email: string
    username: string
    metadata: Record<string, unknown>
    createdAt: string
  }
  accessToken: string
}

export interface UpdateSourceInput {
  id: string
  userId: string
  role: 'user' | 'admin'
  type?: string
  title?: string | null
  url?: string
  metadata?: Record<string, unknown>
}

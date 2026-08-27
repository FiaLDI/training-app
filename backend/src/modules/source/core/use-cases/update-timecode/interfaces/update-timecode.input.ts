export interface UpdateTimecodeInput {
  id: string
  userId: string
  role: 'user' | 'admin'
  seconds?: number
  title?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateTimecodeInput {
  sourceId: string
  userId: string
  role: 'user' | 'admin'
  seconds: number
  title?: string | null
  metadata?: Record<string, unknown>
}

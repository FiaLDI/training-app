export interface CreateSourceInput {
  userId: string
  role: 'user' | 'admin'
  exerciseId: string
  type: string
  title?: string | null
  url: string
  metadata?: Record<string, unknown>
}

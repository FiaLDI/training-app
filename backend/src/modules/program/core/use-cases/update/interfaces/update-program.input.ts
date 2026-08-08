export interface UpdateProgramInput {
  id: string
  userId: string
  name?: string
  description?: string | null
  metadata?: Record<string, unknown>
}

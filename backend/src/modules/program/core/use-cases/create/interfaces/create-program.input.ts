export interface CreateProgramInput {
  userId: string
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

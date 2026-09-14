export interface CreateProgramInput {
  userId: string
  isSystem?: boolean
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

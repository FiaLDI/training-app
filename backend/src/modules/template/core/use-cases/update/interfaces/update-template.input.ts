export interface UpdateTemplateInput {
  userId: string
  id: string
  name?: string
  description?: string | null
  metadata?: Record<string, unknown>
}

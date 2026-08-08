export interface CreateTemplateInput {
  id?: string
  userId: string
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

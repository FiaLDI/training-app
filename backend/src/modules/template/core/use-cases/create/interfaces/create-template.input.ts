export interface CreateTemplateInput {
  id?: string
  userId: string
  isSystem?: boolean
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

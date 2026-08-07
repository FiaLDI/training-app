export interface UpdateSourceInput {
  id: string
  type?: string
  title?: string | null
  url?: string
  metadata?: Record<string, unknown>
}

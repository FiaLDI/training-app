export interface CreateSourceInput {
  exerciseId: string
  type: string
  title?: string | null
  url: string
  metadata?: Record<string, unknown>
}

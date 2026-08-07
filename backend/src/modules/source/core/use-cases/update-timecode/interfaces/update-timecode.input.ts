export interface UpdateTimecodeInput {
  id: string
  seconds?: number
  title?: string | null
  metadata?: Record<string, unknown>
}

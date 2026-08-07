export interface CreateTimecodeInput {
  sourceId: string
  seconds: number
  title?: string | null
  metadata?: Record<string, unknown>
}

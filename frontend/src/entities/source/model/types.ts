export type ExerciseSource = {
  id: string
  exerciseId: string
  type: string
  title: string | null
  url: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type CreateSourceInput = {
  exerciseId: string
  type: string
  title?: string | null
  url: string
  metadata?: Record<string, unknown>
}

export type ListSourcesResult = {
  items: ExerciseSource[]
  total: number
  page: number
  limit: number
}

export type ExerciseTimecode = {
  id: string
  sourceId: string
  seconds: number
  title: string | null
  metadata: Record<string, unknown>
}

export type CreateTimecodeInput = {
  seconds: number
  title?: string | null
}

export type UpdateTimecodeInput = {
  seconds?: number
  title?: string | null
}

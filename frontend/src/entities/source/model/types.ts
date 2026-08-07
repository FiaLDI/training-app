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
}

export type ListSourcesResult = {
  items: ExerciseSource[]
  total: number
  page: number
  limit: number
}

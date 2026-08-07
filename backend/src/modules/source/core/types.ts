export interface ExerciseSource {
  id: string
  exerciseId: string
  type: string
  title: string | null
  url: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ExerciseTimecode {
  id: string
  sourceId: string
  seconds: number
  title: string | null
  metadata: Record<string, unknown>
}

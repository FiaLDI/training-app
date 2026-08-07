export interface UpdateExerciseInput {
  id: string
  name?: string
  description?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

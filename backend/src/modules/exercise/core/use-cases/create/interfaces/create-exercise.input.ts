export interface CreateExerciseInput {
  id?: string
  name: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

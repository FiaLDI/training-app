export interface CreateExerciseInput {
  name: string
  description?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateExerciseInput {
  id?: string
  /** Owning user; null for system exercises. */
  userId: string | null
  name: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

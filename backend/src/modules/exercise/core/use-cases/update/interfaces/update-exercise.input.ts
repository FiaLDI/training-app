export interface UpdateExerciseInput {
  id: string
  userId: string
  role: 'user' | 'admin'
  /** Admin only: promote custom exercise to shared system catalog (user_id NULL). */
  isSystem?: boolean
  name?: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

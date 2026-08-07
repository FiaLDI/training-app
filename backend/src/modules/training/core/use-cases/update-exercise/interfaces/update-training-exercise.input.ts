export interface UpdateTrainingExerciseInput {
  userId: string
  id: string
  exerciseOrder?: number
  targetSets?: number
  minReps?: number | null
  maxReps?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

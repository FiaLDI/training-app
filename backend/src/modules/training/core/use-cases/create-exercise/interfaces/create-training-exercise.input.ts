export interface CreateTrainingExerciseInput {
  userId: string
  trainingId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  minReps?: number | null
  maxReps?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

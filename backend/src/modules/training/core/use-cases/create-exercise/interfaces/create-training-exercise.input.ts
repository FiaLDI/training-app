export interface CreateTrainingExerciseInput {
  id?: string
  userId: string
  trainingId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  maxWeight?: number | null
  previousMaxWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

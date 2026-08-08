export interface CreateTemplateExerciseInput {
  userId: string
  templateId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

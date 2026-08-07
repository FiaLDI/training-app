export interface CreateTemplateExerciseInput {
  userId: string
  templateId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

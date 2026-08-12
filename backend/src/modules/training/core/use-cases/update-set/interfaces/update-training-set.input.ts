export interface UpdateTrainingSetInput {
  userId: string
  id: string
  setNumber?: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
  isWarmup?: boolean
  metadata?: Record<string, unknown>
}

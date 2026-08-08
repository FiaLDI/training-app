export interface CreateTrainingSetInput {
  id?: string
  userId: string
  trainingExerciseId: string
  setNumber: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
  metadata?: Record<string, unknown>
}

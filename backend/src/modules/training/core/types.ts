export type TrainingStatus = 'planned' | 'in_progress' | 'finished' | 'cancelled'

export interface Training {
  id: string
  userId: string
  templateId: string | null
  status: TrainingStatus
  startedAt: string
  finishedAt: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TrainingExercise {
  id: string
  trainingId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  minReps: number | null
  maxReps: number | null
  restSeconds: number | null
  notes: string | null
  metadata: Record<string, unknown>
}

export interface TrainingSet {
  id: string
  trainingExerciseId: string
  setNumber: number
  weight: number | null
  reps: number | null
  rir: number | null
  rpe: number | null
  completed: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export interface TrainingWithDetails extends Training {
  exercises: Array<TrainingExercise & { sets: TrainingSet[] }>
}

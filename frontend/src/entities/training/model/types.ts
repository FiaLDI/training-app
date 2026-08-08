export type TrainingStatus = 'planned' | 'in_progress' | 'finished' | 'cancelled'

export type Training = {
  id: string
  templateId: string | null
  programId: string | null
  programDayId: string | null
  status: TrainingStatus
  scheduledAt: string | null
  startedAt: string | null
  finishedAt: string | null
  notes: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export type TrainingExercise = {
  id: string
  trainingId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup: boolean
  minReps: number | null
  maxReps: number | null
  restSeconds: number | null
  notes: string | null
  metadata: Record<string, unknown>
}

export type TrainingSet = {
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

export type TrainingWithDetails = Training & {
  exercises: Array<TrainingExercise & { sets: TrainingSet[] }>
}

export type CreateTrainingInput = {
  templateId?: string | null
  programId?: string | null
  programDayId?: string | null
  status: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
}

export type CreateTrainingExerciseInput = {
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type CreateTrainingSetInput = {
  setNumber: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
}

export type ListTrainingsResult = {
  items: Training[]
  total: number
  page: number
  limit: number
}

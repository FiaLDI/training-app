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
  isWarmup: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export type TrainingWithDetails = Training & {
  exercises: Array<TrainingExercise & { sets: TrainingSet[] }>
}

export type TrainingSyncStatus = 'pending' | 'synced' | 'error'

export type TrainingSyncMeta = {
  status: TrainingSyncStatus
  reason?: 'local_mode' | 'timeout' | 'network' | 'server'
  serverSyncedAt?: string
  error?: string
  failedAt?: string
}

export type CreateTrainingInput = {
  id?: string
  templateId?: string | null
  programId?: string | null
  programDayId?: string | null
  status: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type CreateTrainingExerciseInput = {
  id?: string
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
  id?: string
  setNumber: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
  isWarmup?: boolean
  metadata?: Record<string, unknown>
}

export type UpdateTrainingExerciseInput = {
  exerciseOrder?: number
  targetSets?: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export type ListTrainingsResult = {
  items: Training[]
  total: number
  page: number
  limit: number
}

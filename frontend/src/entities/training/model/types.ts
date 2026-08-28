export type TrainingStatus = 'planned' | 'in_progress' | 'finished' | 'cancelled'

export type ExerciseGroupType = 'superset' | 'triset' | 'circuit'

export type TrainingExerciseGroup = {
  id: string
  trainingId: string
  type: ExerciseGroupType
  groupOrder: number
  restSeconds: number | null
  metadata: Record<string, unknown>
}

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
  maxWeight: number | null
  previousMaxWeight: number | null
  restSeconds: number | null
  notes: string | null
  groupId: string | null
  positionInGroup: number | null
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
  groups: TrainingExerciseGroup[]
  exercises: Array<TrainingExercise & { sets: TrainingSet[] }>
}

export type TrainingSyncStatus = 'pending' | 'synced' | 'error'

export type TrainingSyncMeta = {
  status: TrainingSyncStatus
  reason?: 'local_mode' | 'queued' | 'timeout' | 'network' | 'server'
  serverSyncedAt?: string
  contentHash?: string
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
  maxWeight?: number | null
  previousMaxWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  groupId?: string | null
  positionInGroup?: number | null
  metadata?: Record<string, unknown>
}

export type CreateTrainingExerciseGroupInput = {
  id?: string
  exerciseIds: string[]
  type?: ExerciseGroupType
  restSeconds?: number | null
}

export type AddExerciseToTrainingGroupInput = {
  groupId: string
  exerciseId: string
}

export type UpdateTrainingExerciseGroupInput = {
  restSeconds?: number | null
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
  maxWeight?: number | null
  previousMaxWeight?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  groupId?: string | null
  positionInGroup?: number | null
  metadata?: Record<string, unknown>
}

export type ListTrainingsResult = {
  items: Training[]
  total: number
  page: number
  limit: number
}

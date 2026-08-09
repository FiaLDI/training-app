import {
  ExerciseProgressPoint,
  Training,
  TrainingExercise,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
  VolumeStatPoint,
} from '../types'

export interface ListTrainingsRepositoryInput {
  userId: string
  page: number
  limit: number
  status?: TrainingStatus
  from?: string
  to?: string
}

export interface ListTrainingsRepositoryOutput {
  items: Training[]
  total: number
  page: number
  limit: number
}

export interface CreateTrainingRepositoryInput {
  id?: string
  userId: string
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

export interface UpdateTrainingRepositoryInput {
  id: string
  userId: string
  status?: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
  programId?: string | null
  programDayId?: string | null
  templateId?: string | null
}

export interface CreateTrainingExerciseRepositoryInput {
  id?: string
  trainingId: string
  userId: string
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

export interface UpdateTrainingExerciseRepositoryInput {
  id: string
  userId: string
  exerciseOrder?: number
  targetSets?: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateTrainingSetRepositoryInput {
  id?: string
  trainingExerciseId: string
  userId: string
  setNumber: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateTrainingSetRepositoryInput {
  id: string
  userId: string
  setNumber?: number
  weight?: number | null
  reps?: number | null
  rir?: number | null
  rpe?: number | null
  completed?: boolean
  metadata?: Record<string, unknown>
}

export interface VolumeStatsRepositoryInput {
  userId: string
  from: string
  to: string
}

export interface ExerciseProgressRepositoryInput {
  userId: string
  exerciseId: string
  from: string
  to: string
}

export interface TrainingRepositoryPort {
  list(input: ListTrainingsRepositoryInput): Promise<ListTrainingsRepositoryOutput>
  getById(id: string, userId: string): Promise<TrainingWithDetails | null>
  create(input: CreateTrainingRepositoryInput): Promise<Training>
  update(input: UpdateTrainingRepositoryInput): Promise<Training | null>
  delete(id: string, userId: string): Promise<boolean>
  findActiveByProgramDay(
    userId: string,
    programDayId: string,
    scheduledAt: string,
  ): Promise<Training | null>
  findActiveOnScheduledDate(userId: string, scheduledAt: string): Promise<Training | null>

  createExercise(input: CreateTrainingExerciseRepositoryInput): Promise<TrainingExercise | null>
  updateExercise(input: UpdateTrainingExerciseRepositoryInput): Promise<TrainingExercise | null>
  deleteExercise(id: string, userId: string): Promise<boolean>

  createSet(input: CreateTrainingSetRepositoryInput): Promise<TrainingSet | null>
  updateSet(input: UpdateTrainingSetRepositoryInput): Promise<TrainingSet | null>
  deleteSet(id: string, userId: string): Promise<boolean>

  getVolumeStats(input: VolumeStatsRepositoryInput): Promise<VolumeStatPoint[]>
  getExerciseProgress(input: ExerciseProgressRepositoryInput): Promise<ExerciseProgressPoint[]>
}

export const TRAINING_REPOSITORY_PORT = Symbol('TRAINING_REPOSITORY_PORT')

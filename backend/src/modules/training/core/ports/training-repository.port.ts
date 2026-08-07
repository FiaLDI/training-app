import {
  Training,
  TrainingExercise,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
} from '../types'

export interface ListTrainingsRepositoryInput {
  userId: string
  page: number
  limit: number
  status?: TrainingStatus
}

export interface ListTrainingsRepositoryOutput {
  items: Training[]
  total: number
  page: number
  limit: number
}

export interface CreateTrainingRepositoryInput {
  userId: string
  templateId?: string | null
  status: TrainingStatus
  startedAt: string
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateTrainingRepositoryInput {
  id: string
  userId: string
  status?: TrainingStatus
  startedAt?: string
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateTrainingExerciseRepositoryInput {
  trainingId: string
  userId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
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
  minReps?: number | null
  maxReps?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateTrainingSetRepositoryInput {
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

export interface TrainingRepositoryPort {
  list(input: ListTrainingsRepositoryInput): Promise<ListTrainingsRepositoryOutput>
  getById(id: string, userId: string): Promise<TrainingWithDetails | null>
  create(input: CreateTrainingRepositoryInput): Promise<Training>
  update(input: UpdateTrainingRepositoryInput): Promise<Training | null>
  delete(id: string, userId: string): Promise<boolean>

  createExercise(input: CreateTrainingExerciseRepositoryInput): Promise<TrainingExercise | null>
  updateExercise(input: UpdateTrainingExerciseRepositoryInput): Promise<TrainingExercise | null>
  deleteExercise(id: string, userId: string): Promise<boolean>

  createSet(input: CreateTrainingSetRepositoryInput): Promise<TrainingSet | null>
  updateSet(input: UpdateTrainingSetRepositoryInput): Promise<TrainingSet | null>
  deleteSet(id: string, userId: string): Promise<boolean>
}

export const TRAINING_REPOSITORY_PORT = Symbol('TRAINING_REPOSITORY_PORT')

import { Exercise } from '../types'

export type ExerciseCatalogKey = {
  id: string
  name: string
  isSystem: boolean
}

export interface ListExercisesRepositoryInput {
  userId: string
  page: number
  limit: number
  q?: string
}

export interface ListExercisesRepositoryOutput {
  items: Exercise[]
  total: number
  page: number
  limit: number
}

export interface CreateExerciseRepositoryInput {
  id?: string
  userId: string | null
  isSystem: boolean
  name: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateExerciseRepositoryInput {
  id: string
  /** Set to null to promote custom → system. */
  userId?: string | null
  isSystem?: boolean
  name?: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

export interface ExerciseRepositoryPort {
  list(input: ListExercisesRepositoryInput): Promise<ListExercisesRepositoryOutput>
  /** Visible if system or owned by viewerUserId. */
  getById(id: string, viewerUserId: string): Promise<Exercise | null>
  getByIdAny(id: string): Promise<Exercise | null>
  listSystem(): Promise<Exercise[]>
  listCatalogKeys(): Promise<ExerciseCatalogKey[]>
  create(input: CreateExerciseRepositoryInput): Promise<Exercise>
  update(input: UpdateExerciseRepositoryInput): Promise<Exercise | null>
  delete(id: string): Promise<boolean>
}

export const EXERCISE_REPOSITORY_PORT = Symbol('EXERCISE_REPOSITORY_PORT')

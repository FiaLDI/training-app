import { Exercise } from '../types'

export interface ListExercisesRepositoryInput {
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
  name: string
  description?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateExerciseRepositoryInput {
  id: string
  name?: string
  description?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
}

export interface ExerciseRepositoryPort {
  list(input: ListExercisesRepositoryInput): Promise<ListExercisesRepositoryOutput>
  getById(id: string): Promise<Exercise | null>
  create(input: CreateExerciseRepositoryInput): Promise<Exercise>
  update(input: UpdateExerciseRepositoryInput): Promise<Exercise | null>
  delete(id: string): Promise<boolean>
}

export const EXERCISE_REPOSITORY_PORT = Symbol('EXERCISE_REPOSITORY_PORT')

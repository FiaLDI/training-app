import { ExerciseSource, ExerciseTimecode } from '../types'

export interface ListSourcesRepositoryInput {
  page: number
  limit: number
  exerciseId?: string
}

export interface ListSourcesRepositoryOutput {
  items: ExerciseSource[]
  total: number
  page: number
  limit: number
}

export interface CreateSourceRepositoryInput {
  exerciseId: string
  type: string
  title?: string | null
  url: string
  metadata?: Record<string, unknown>
}

export interface UpdateSourceRepositoryInput {
  id: string
  type?: string
  title?: string | null
  url?: string
  metadata?: Record<string, unknown>
}

export interface CreateTimecodeRepositoryInput {
  sourceId: string
  seconds: number
  title?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateTimecodeRepositoryInput {
  id: string
  seconds?: number
  title?: string | null
  metadata?: Record<string, unknown>
}

export interface SourceRepositoryPort {
  list(input: ListSourcesRepositoryInput): Promise<ListSourcesRepositoryOutput>
  getById(id: string): Promise<ExerciseSource | null>
  create(input: CreateSourceRepositoryInput): Promise<ExerciseSource>
  update(input: UpdateSourceRepositoryInput): Promise<ExerciseSource | null>
  delete(id: string): Promise<boolean>

  listTimecodes(sourceId: string): Promise<ExerciseTimecode[]>
  getTimecodeById(id: string): Promise<ExerciseTimecode | null>
  createTimecode(input: CreateTimecodeRepositoryInput): Promise<ExerciseTimecode>
  updateTimecode(input: UpdateTimecodeRepositoryInput): Promise<ExerciseTimecode | null>
  deleteTimecode(id: string): Promise<boolean>
}

export const SOURCE_REPOSITORY_PORT = Symbol('SOURCE_REPOSITORY_PORT')

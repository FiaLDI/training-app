import { TemplateExercise, TemplateExerciseGroup, WorkoutTemplate, WorkoutTemplateWithExercises } from '../types'

export interface ListTemplatesRepositoryInput {
  userId: string
  page: number
  limit: number
  q?: string
}

export interface ListTemplatesRepositoryOutput {
  items: WorkoutTemplate[]
  total: number
  page: number
  limit: number
}

export interface CreateTemplateRepositoryInput {
  id?: string
  userId: string
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface UpdateTemplateRepositoryInput {
  id: string
  userId: string
  name?: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateTemplateExerciseRepositoryInput {
  id?: string
  templateId: string
  userId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  metadata?: Record<string, unknown>
  groupId?: string | null
  positionInGroup?: number | null
}

export interface UpdateTemplateExerciseRepositoryInput {
  id: string
  userId: string
  exerciseOrder?: number
  targetSets?: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
  groupId?: string | null
  positionInGroup?: number | null
  metadata?: Record<string, unknown>
}

import { ExerciseGroupType } from '../../../../common/core/exercise-group'

export interface CreateTemplateExerciseGroupRepositoryInput {
  id?: string
  templateId: string
  userId: string
  type?: ExerciseGroupType
  groupOrder: number
  restSeconds?: number | null
  exerciseIds: string[]
  metadata?: Record<string, unknown>
}

export interface AddExerciseToTemplateGroupRepositoryInput {
  groupId: string
  exerciseId: string
  userId: string
}

export interface UpdateTemplateExerciseGroupRepositoryInput {
  id: string
  userId: string
  restSeconds?: number | null
  metadata?: Record<string, unknown>
}

export interface TemplateRepositoryPort {
  list(input: ListTemplatesRepositoryInput): Promise<ListTemplatesRepositoryOutput>
  getById(id: string, userId: string): Promise<WorkoutTemplateWithExercises | null>
  create(input: CreateTemplateRepositoryInput): Promise<WorkoutTemplate>
  update(input: UpdateTemplateRepositoryInput): Promise<WorkoutTemplate | null>
  delete(id: string, userId: string): Promise<boolean>

  listExercises(templateId: string): Promise<TemplateExercise[]>
  createExercise(input: CreateTemplateExerciseRepositoryInput): Promise<TemplateExercise | null>
  updateExercise(input: UpdateTemplateExerciseRepositoryInput): Promise<TemplateExercise | null>
  deleteExercise(id: string, userId: string): Promise<boolean>

  listGroups(templateId: string): Promise<TemplateExerciseGroup[]>
  createGroup(input: CreateTemplateExerciseGroupRepositoryInput): Promise<TemplateExerciseGroup | null>
  addExerciseToGroup(input: AddExerciseToTemplateGroupRepositoryInput): Promise<TemplateExerciseGroup | null>
  updateGroup(input: UpdateTemplateExerciseGroupRepositoryInput): Promise<TemplateExerciseGroup | null>
  deleteGroup(id: string, userId: string): Promise<boolean>
}

export const TEMPLATE_REPOSITORY_PORT = Symbol('TEMPLATE_REPOSITORY_PORT')

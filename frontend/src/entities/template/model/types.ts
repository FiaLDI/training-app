export type ExerciseGroupType = 'superset' | 'triset' | 'circuit'

export type TemplateExerciseGroup = {
  id: string
  templateId: string
  type: ExerciseGroupType
  groupOrder: number
  restSeconds: number | null
  metadata: Record<string, unknown>
}

export type WorkoutTemplate = {
  id: string
  name: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type TemplateExercise = {
  id: string
  templateId: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
  isWarmup: boolean
  minReps: number | null
  maxReps: number | null
  targetWeight: number | null
  restSeconds: number | null
  notes: string | null
  groupId: string | null
  positionInGroup: number | null
  metadata: Record<string, unknown>
}

export type WorkoutTemplateWithExercises = WorkoutTemplate & {
  groups: TemplateExerciseGroup[]
  exercises: TemplateExercise[]
}

export type CreateTemplateInput = {
  id?: string
  name: string
  description?: string | null
  metadata?: Record<string, unknown>
}

export type CreateTemplateExerciseInput = {
  id?: string
  exerciseId: string
  exerciseOrder: number
  targetSets: number
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

export type CreateTemplateExerciseGroupInput = {
  id?: string
  exerciseIds: string[]
  type?: ExerciseGroupType
  restSeconds?: number | null
}

export type AddExerciseToTemplateGroupInput = {
  groupId: string
  exerciseId: string
}

export type UpdateTemplateExerciseGroupInput = {
  restSeconds?: number | null
}

export type UpdateTemplateExerciseInput = {
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
}

export type ListTemplatesResult = {
  items: WorkoutTemplate[]
  total: number
  page: number
  limit: number
}

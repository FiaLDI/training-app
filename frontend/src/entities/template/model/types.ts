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
  metadata: Record<string, unknown>
}

export type WorkoutTemplateWithExercises = WorkoutTemplate & {
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
  metadata?: Record<string, unknown>
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
}

export type ListTemplatesResult = {
  items: WorkoutTemplate[]
  total: number
  page: number
  limit: number
}

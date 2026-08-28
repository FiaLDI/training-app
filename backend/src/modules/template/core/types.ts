import { ExerciseGroupType } from '../../../common/core/exercise-group'

export type { ExerciseGroupType }

export interface TemplateExerciseGroup {
  id: string
  templateId: string
  type: ExerciseGroupType
  groupOrder: number
  restSeconds: number | null
  metadata: Record<string, unknown>
}

export interface WorkoutTemplate {
  id: string
  userId: string
  name: string
  description: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface TemplateExercise {
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

export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  groups: TemplateExerciseGroup[]
  exercises: TemplateExercise[]
}

export type TrainingStatus = 'planned' | 'in_progress' | 'finished' | 'cancelled'

import { ExerciseGroupType } from '../../../common/core/exercise-group'

export type { ExerciseGroupType }

export interface TrainingExerciseGroup {
  id: string
  trainingId: string
  type: ExerciseGroupType
  groupOrder: number
  restSeconds: number | null
  metadata: Record<string, unknown>
}

export interface Training {
  id: string
  userId: string
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

export interface TrainingExercise {
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

export interface TrainingSet {
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

export interface TrainingWithDetails extends Training {
  groups: TrainingExerciseGroup[]
  exercises: Array<TrainingExercise & { sets: TrainingSet[] }>
}

export interface VolumeStatPoint {
  date: string
  volume: number
}

export interface ExerciseProgressPoint {
  date: string
  maxWeight: number | null
  bestVolume: number
}

export interface MuscleGroupStatPoint {
  muscleGroup: string
  volume: number
  sets: number
}

export interface MuscleGroupVolumeRow {
  muscleGroupRaw: string
  volume: number
  sets: number
}

export interface ActivityStatPoint {
  date: string
  sessionCount: number
  volume: number
}

export interface StrengthCorrelationPoint {
  date: string
  bodyWeight: number | null
  maxWeight: number | null
  volume: number
}

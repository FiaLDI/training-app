export type SnapshotExercise = {
  exerciseName: string
  exerciseId?: string
  exerciseOrder: number
  targetSets: number
  isWarmup?: boolean
  minReps?: number | null
  maxReps?: number | null
  targetWeight?: number | null
  restSeconds?: number | null
  notes?: string | null
}

export type SnapshotTemplate = {
  name: string
  description: string | null
  exercises: SnapshotExercise[]
}

export type SnapshotProgramDay = {
  dayOfWeek: number
  slotOrder: number
  notes: string | null
  template: SnapshotTemplate | null
}

export type ProgramSnapshot = {
  name: string
  description: string | null
  days: SnapshotProgramDay[]
}

export type SharedResource =
  | {
      kind: 'template'
      name: string
      description: string | null
      template: SnapshotTemplate
    }
  | {
      kind: 'program'
      name: string
      description: string | null
      program: ProgramSnapshot
    }

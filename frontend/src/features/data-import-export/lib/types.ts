export const EXPORT_VERSION = 1 as const

export type ParsedSet = {
  setNumber: number
  weight: number | null
  reps: number | null
  rpe: number | null
  isWarmup: boolean
  notes: string | null
}

export type ParsedExercise = {
  name: string
  muscleGroup: string | null
  notes: string | null
  sets: ParsedSet[]
}

export type ParsedWorkout = {
  key: string
  title: string | null
  startedAt: string
  finishedAt: string | null
  notes: string | null
  exercises: ParsedExercise[]
}

export type CsvImportFormat = 'strong' | 'hevy' | 'fitnotes'

export type ImportResult = {
  format: 'json' | CsvImportFormat
  workoutsImported: number
  workoutsSkipped: number
  exercisesCreated: number
  setsImported: number
  warnings: string[]
}

export type ParsedWorkoutImportResult = Omit<ImportResult, 'format'>

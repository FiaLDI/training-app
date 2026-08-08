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
  metadata: Record<string, unknown>
}

export interface WorkoutTemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[]
}

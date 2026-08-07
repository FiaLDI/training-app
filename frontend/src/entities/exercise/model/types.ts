export type Exercise = {
  id: string
  name: string
  description: string | null
  muscleGroup: string | null
  equipment: string | null
  difficulty: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CreateExerciseInput = {
  name: string
  description?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  difficulty?: string | null
}

export type UpdateExerciseInput = Partial<CreateExerciseInput> & {
  metadata?: Record<string, unknown>
}

export type ListExercisesResult = {
  items: Exercise[]
  total: number
  page: number
  limit: number
}

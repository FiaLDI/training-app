export type Exercise = {
  id: string
  /** null/undefined = system exercise; uuid = custom owned by that user */
  userId?: string | null
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type CreateExerciseInput = {
  id?: string
  name: string
  description?: string | null
  muscleGroup?: string | null
  difficulty?: string | null
  metadata?: Record<string, unknown>
  /** Admin only — create shared system exercise */
  isSystem?: boolean
}

export type UpdateExerciseInput = Partial<Omit<CreateExerciseInput, 'id'>> & {
  metadata?: Record<string, unknown>
  /** Admin only: promote custom → system catalog */
  isSystem?: boolean
}

export type ListExercisesResult = {
  items: Exercise[]
  total: number
  page: number
  limit: number
}

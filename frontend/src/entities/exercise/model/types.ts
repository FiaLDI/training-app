export type Exercise = {
  id: string
  /** null/undefined until synced; uuid = custom owner */
  userId?: string | null
  isSystem: boolean
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

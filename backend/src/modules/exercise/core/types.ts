export interface Exercise {
  id: string
  /** null = system (shared) exercise; uuid = custom owned by that user */
  userId: string | null
  isSystem: boolean
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

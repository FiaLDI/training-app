export interface Exercise {
  id: string
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ListSourcesInput {
  userId: string
  role: 'user' | 'admin'
  page: number
  limit: number
  exerciseId?: string
}

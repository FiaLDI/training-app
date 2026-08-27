export interface DeleteExerciseInput {
  id: string
  userId: string
  role: 'user' | 'admin'
}

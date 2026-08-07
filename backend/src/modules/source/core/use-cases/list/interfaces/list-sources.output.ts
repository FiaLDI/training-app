import { ExerciseSource } from '../../../types'

export interface ListSourcesOutput {
  items: ExerciseSource[]
  total: number
  page: number
  limit: number
}

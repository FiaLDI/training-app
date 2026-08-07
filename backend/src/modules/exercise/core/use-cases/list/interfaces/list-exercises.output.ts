import { Exercise } from '../../../types'

export interface ListExercisesOutput {
  items: Exercise[]
  total: number
  page: number
  limit: number
}

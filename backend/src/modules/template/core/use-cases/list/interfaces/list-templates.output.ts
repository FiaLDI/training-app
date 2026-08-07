import { WorkoutTemplate } from '../../../types'

export interface ListTemplatesOutput {
  items: WorkoutTemplate[]
  total: number
  page: number
  limit: number
}

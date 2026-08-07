import { Training } from '../../../types'

export interface ListTrainingsOutput {
  items: Training[]
  total: number
  page: number
  limit: number
}

import { TrainingStatus } from '../../../types'

export interface ListTrainingsInput {
  userId: string
  page: number
  limit: number
  status?: TrainingStatus
  from?: string
  to?: string
}

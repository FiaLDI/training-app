import { TrainingStatus } from '../../../types'

export interface UpdateTrainingInput {
  userId: string
  id: string
  status?: TrainingStatus
  startedAt?: string
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

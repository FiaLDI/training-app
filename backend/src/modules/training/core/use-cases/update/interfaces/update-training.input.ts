import { TrainingStatus } from '../../../types'

export interface UpdateTrainingInput {
  userId: string
  id: string
  status?: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

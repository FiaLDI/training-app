import { TrainingStatus } from '../../../types'

export interface CreateTrainingInput {
  userId: string
  templateId?: string | null
  status: TrainingStatus
  startedAt: string
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

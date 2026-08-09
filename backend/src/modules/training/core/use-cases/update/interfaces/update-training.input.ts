import { TrainingStatus } from '../../../types'

export interface UpdateTrainingInput {
  userId: string
  id: string
  templateId?: string | null
  programId?: string | null
  programDayId?: string | null
  status?: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

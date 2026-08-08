import { TrainingStatus } from '../../../types'

export interface CreateTrainingInput {
  id?: string
  userId: string
  templateId?: string | null
  programId?: string | null
  programDayId?: string | null
  status: TrainingStatus
  scheduledAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

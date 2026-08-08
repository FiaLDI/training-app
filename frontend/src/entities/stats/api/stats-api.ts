import { apiRequest } from '@/shared/api/client'

import type { ExerciseProgressResult, VolumeStatsResult } from '../model/types'

export const statsApi = {
  volume(params: { from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<VolumeStatsResult>(`/stats/volume?${search}`)
  },

  exerciseProgress(params: { exerciseId: string; from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<ExerciseProgressResult>(`/stats/exercise-progress?${search}`)
  },
}

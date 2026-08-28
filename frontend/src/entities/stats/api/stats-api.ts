import { apiRequest } from '@/shared/api/client'

import type {
  ActivityStatsResult,
  ExerciseProgressResult,
  MuscleGroupStatsResult,
  StrengthCorrelationResult,
  VolumeStatsResult,
} from '../model/types'

export const statsApi = {
  volume(params: { from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<VolumeStatsResult>(`/stats/volume?${search}`)
  },

  exerciseProgress(params: { exerciseId: string; from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<ExerciseProgressResult>(`/stats/exercise-progress?${search}`)
  },

  muscleGroups(params: { from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<MuscleGroupStatsResult>(`/stats/muscle-groups?${search}`)
  },

  activity(params: { from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<ActivityStatsResult>(`/stats/activity?${search}`)
  },

  strengthCorrelation(params: { exerciseId: string; from: string; to: string }) {
    const search = new URLSearchParams(params)
    return apiRequest<StrengthCorrelationResult>(`/stats/strength-correlation?${search}`)
  },
}

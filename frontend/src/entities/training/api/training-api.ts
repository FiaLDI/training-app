import { apiRequest } from '@/shared/api/client'

import type {
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  ListTrainingsResult,
  Training,
  TrainingExercise,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
} from '../model/types'

export const trainingApi = {
  list(params: { page?: number; limit?: number; status?: TrainingStatus } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.status) search.set('status', params.status)
    const qs = search.toString()
    return apiRequest<ListTrainingsResult>(`/trainings${qs ? `?${qs}` : ''}`)
  },

  getById(id: string) {
    return apiRequest<TrainingWithDetails>(`/trainings/${id}`)
  },

  create(input: CreateTrainingInput) {
    return apiRequest<Training>('/trainings', { method: 'POST', body: input })
  },

  update(id: string, input: Partial<CreateTrainingInput>) {
    return apiRequest<Training>(`/trainings/${id}`, { method: 'PATCH', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/trainings/${id}`, { method: 'DELETE' })
  },

  addExercise(trainingId: string, input: CreateTrainingExerciseInput) {
    return apiRequest<TrainingExercise>(`/trainings/${trainingId}/exercises`, {
      method: 'POST',
      body: input,
    })
  },

  removeExercise(exerciseId: string) {
    return apiRequest<{ deleted: boolean }>(`/trainings/exercises/${exerciseId}`, {
      method: 'DELETE',
    })
  },

  addSet(exerciseId: string, input: CreateTrainingSetInput) {
    return apiRequest<TrainingSet>(`/trainings/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: input,
    })
  },

  updateSet(setId: string, input: Partial<CreateTrainingSetInput>) {
    return apiRequest<TrainingSet>(`/trainings/sets/${setId}`, {
      method: 'PATCH',
      body: input,
    })
  },

  removeSet(setId: string) {
    return apiRequest<{ deleted: boolean }>(`/trainings/sets/${setId}`, { method: 'DELETE' })
  },
}

import { apiRequest } from '@/shared/api/client'

import type {
  CreateExerciseInput,
  Exercise,
  ListExercisesResult,
  UpdateExerciseInput,
} from '../model/types'

export const exerciseApi = {
  list(params: { page?: number; limit?: number; q?: string } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.q) search.set('q', params.q)
    const qs = search.toString()
    return apiRequest<ListExercisesResult>(`/exercises${qs ? `?${qs}` : ''}`)
  },

  getById(id: string) {
    return apiRequest<Exercise>(`/exercises/${id}`)
  },

  create(input: CreateExerciseInput) {
    return apiRequest<Exercise>('/exercises', { method: 'POST', body: input })
  },

  update(id: string, input: UpdateExerciseInput) {
    return apiRequest<Exercise>(`/exercises/${id}`, { method: 'PATCH', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/exercises/${id}`, { method: 'DELETE' })
  },
}

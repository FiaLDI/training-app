import { apiRequest } from '@/shared/api/client'

import type {
  CreateExerciseInput,
  Exercise,
  ListExercisesResult,
  UpdateExerciseInput,
} from '../model/types'

export const exerciseApi = {
  list(
    params: {
      page?: number
      limit?: number
      q?: string
      timeoutMs?: number
    } = {},
  ) {
    const { timeoutMs, ...query } = params
    const search = new URLSearchParams()
    if (query.page) search.set('page', String(query.page))
    if (query.limit) search.set('limit', String(query.limit))
    if (query.q) search.set('q', query.q)
    const qs = search.toString()
    return apiRequest<ListExercisesResult>(`/exercises${qs ? `?${qs}` : ''}`, {
      timeoutMs,
    })
  },

  getById(id: string, extras: { timeoutMs?: number } = {}) {
    return apiRequest<Exercise>(`/exercises/${id}`, extras)
  },

  create(input: CreateExerciseInput, extras: { timeoutMs?: number } = {}) {
    return apiRequest<Exercise>('/exercises', { method: 'POST', body: input, ...extras })
  },

  update(id: string, input: UpdateExerciseInput, extras: { timeoutMs?: number } = {}) {
    return apiRequest<Exercise>(`/exercises/${id}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  remove(id: string, extras: { timeoutMs?: number } = {}) {
    return apiRequest<{ deleted: boolean }>(`/exercises/${id}`, {
      method: 'DELETE',
      ...extras,
    })
  },
}

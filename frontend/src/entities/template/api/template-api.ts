import { apiRequest } from '@/shared/api/client'

import type {
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  ListTemplatesResult,
  TemplateExercise,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from '../model/types'

export const templateApi = {
  list(params: { page?: number; limit?: number; q?: string } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.q) search.set('q', params.q)
    const qs = search.toString()
    return apiRequest<ListTemplatesResult>(`/templates${qs ? `?${qs}` : ''}`)
  },

  getById(id: string) {
    return apiRequest<WorkoutTemplateWithExercises>(`/templates/${id}`)
  },

  create(input: CreateTemplateInput) {
    return apiRequest<WorkoutTemplate>('/templates', { method: 'POST', body: input })
  },

  update(id: string, input: Partial<CreateTemplateInput>) {
    return apiRequest<WorkoutTemplate>(`/templates/${id}`, { method: 'PATCH', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/templates/${id}`, { method: 'DELETE' })
  },

  addExercise(templateId: string, input: CreateTemplateExerciseInput) {
    return apiRequest<TemplateExercise>(`/templates/${templateId}/exercises`, {
      method: 'POST',
      body: input,
    })
  },

  updateExercise(exerciseId: string, input: UpdateTemplateExerciseInput) {
    return apiRequest<TemplateExercise>(`/templates/exercises/${exerciseId}`, {
      method: 'PATCH',
      body: input,
    })
  },

  removeExercise(exerciseId: string) {
    return apiRequest<{ deleted: boolean }>(`/templates/exercises/${exerciseId}`, {
      method: 'DELETE',
    })
  },
}

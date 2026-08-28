import { apiRequest } from '@/shared/api/client'

import type {
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  CreateTemplateExerciseGroupInput,
  ExerciseGroupType,
  ListTemplatesResult,
  TemplateExercise,
  TemplateExerciseGroup,
  UpdateTemplateExerciseGroupInput,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from '../model/types'

type RequestExtras = {
  timeoutMs?: number
}

export const templateApi = {
  list(params: { page?: number; limit?: number; q?: string } & RequestExtras = {}) {
    const { timeoutMs, ...query } = params
    const search = new URLSearchParams()
    if (query.page) search.set('page', String(query.page))
    if (query.limit) search.set('limit', String(query.limit))
    if (query.q) search.set('q', query.q)
    const qs = search.toString()
    return apiRequest<ListTemplatesResult>(`/templates${qs ? `?${qs}` : ''}`, { timeoutMs })
  },

  getById(id: string, extras: RequestExtras = {}) {
    return apiRequest<WorkoutTemplateWithExercises>(`/templates/${id}`, extras)
  },

  create(input: CreateTemplateInput, extras: RequestExtras = {}) {
    return apiRequest<WorkoutTemplate>('/templates', {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  update(id: string, input: Partial<CreateTemplateInput>, extras: RequestExtras = {}) {
    return apiRequest<WorkoutTemplate>(`/templates/${id}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  remove(id: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/templates/${id}`, {
      method: 'DELETE',
      ...extras,
    })
  },

  addExercise(
    templateId: string,
    input: CreateTemplateExerciseInput,
    extras: RequestExtras = {},
  ) {
    return apiRequest<TemplateExercise>(`/templates/${templateId}/exercises`, {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  updateExercise(
    exerciseId: string,
    input: UpdateTemplateExerciseInput,
    extras: RequestExtras = {},
  ) {
    return apiRequest<TemplateExercise>(`/templates/exercises/${exerciseId}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  removeExercise(exerciseId: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/templates/exercises/${exerciseId}`, {
      method: 'DELETE',
      ...extras,
    })
  },

  createGroup(
    templateId: string,
    input: {
      id?: string
      exerciseIds: string[]
      type?: ExerciseGroupType
      restSeconds?: number | null
    },
    extras: RequestExtras = {},
  ) {
    return apiRequest<TemplateExerciseGroup>(`/templates/${templateId}/groups`, {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  addExerciseToGroup(
    groupId: string,
    input: { exerciseId: string },
    extras: RequestExtras = {},
  ) {
    return apiRequest<TemplateExerciseGroup>(`/templates/groups/${groupId}/exercises`, {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  updateGroup(
    groupId: string,
    input: { restSeconds?: number | null },
    extras: RequestExtras = {},
  ) {
    return apiRequest<TemplateExerciseGroup>(`/templates/groups/${groupId}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  deleteGroup(groupId: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/templates/groups/${groupId}`, {
      method: 'DELETE',
      ...extras,
    })
  },
}

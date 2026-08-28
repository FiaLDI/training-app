import { apiRequest } from '@/shared/api/client'

import type {
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  ExerciseGroupType,
  ListTrainingsResult,
  Training,
  TrainingExercise,
  TrainingExerciseGroup,
  TrainingSet,
  TrainingStatus,
  TrainingWithDetails,
  UpdateTrainingExerciseInput,
} from '../model/types'

type RequestExtras = {
  timeoutMs?: number
}

export const trainingApi = {
  list(
    params: {
      page?: number
      limit?: number
      status?: TrainingStatus
      from?: string
      to?: string
    } & RequestExtras = {},
  ) {
    const { timeoutMs, ...query } = params
    const search = new URLSearchParams()
    if (query.page) search.set('page', String(query.page))
    if (query.limit) search.set('limit', String(query.limit))
    if (query.status) search.set('status', query.status)
    if (query.from) search.set('from', query.from)
    if (query.to) search.set('to', query.to)
    const qs = search.toString()
    return apiRequest<ListTrainingsResult>(`/trainings${qs ? `?${qs}` : ''}`, { timeoutMs })
  },

  getById(id: string, extras: RequestExtras = {}) {
    return apiRequest<TrainingWithDetails>(`/trainings/${id}`, extras)
  },

  create(input: CreateTrainingInput, extras: RequestExtras = {}) {
    return apiRequest<TrainingWithDetails>('/trainings', {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  update(id: string, input: Partial<CreateTrainingInput>, extras: RequestExtras = {}) {
    return apiRequest<Training>(`/trainings/${id}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  remove(id: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/trainings/${id}`, {
      method: 'DELETE',
      ...extras,
    })
  },

  addExercise(
    trainingId: string,
    input: CreateTrainingExerciseInput,
    extras: RequestExtras = {},
  ) {
    return apiRequest<TrainingExercise>(`/trainings/${trainingId}/exercises`, {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  updateExercise(
    exerciseId: string,
    input: UpdateTrainingExerciseInput,
    extras: RequestExtras = {},
  ) {
    return apiRequest<TrainingExercise>(`/trainings/exercises/${exerciseId}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  removeExercise(exerciseId: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/trainings/exercises/${exerciseId}`, {
      method: 'DELETE',
      ...extras,
    })
  },

  addSet(exerciseId: string, input: CreateTrainingSetInput, extras: RequestExtras = {}) {
    return apiRequest<TrainingSet>(`/trainings/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  updateSet(
    setId: string,
    input: Partial<CreateTrainingSetInput>,
    extras: RequestExtras = {},
  ) {
    return apiRequest<TrainingSet>(`/trainings/sets/${setId}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  removeSet(setId: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/trainings/sets/${setId}`, {
      method: 'DELETE',
      ...extras,
    })
  },

  createGroup(
    trainingId: string,
    input: {
      id?: string
      exerciseIds: string[]
      type?: ExerciseGroupType
      restSeconds?: number | null
    },
    extras: RequestExtras = {},
  ) {
    return apiRequest<TrainingExerciseGroup>(`/trainings/${trainingId}/groups`, {
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
    return apiRequest<TrainingExerciseGroup>(`/trainings/groups/${groupId}/exercises`, {
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
    return apiRequest<TrainingExerciseGroup>(`/trainings/groups/${groupId}`, {
      method: 'PATCH',
      body: input,
      ...extras,
    })
  },

  deleteGroup(groupId: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/trainings/groups/${groupId}`, {
      method: 'DELETE',
      ...extras,
    })
  },
}

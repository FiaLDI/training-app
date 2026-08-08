import { apiRequest } from '@/shared/api/client'

import type {
  ApplyProgramResult,
  CreateProgramDayInput,
  CreateProgramInput,
  ListProgramsResult,
  Program,
  ProgramDay,
  ProgramWithDays,
  UpdateProgramDayInput,
} from '../model/types'

export const programApi = {
  list(params: { page?: number; limit?: number } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return apiRequest<ListProgramsResult>(`/programs${qs ? `?${qs}` : ''}`)
  },

  getById(id: string) {
    return apiRequest<ProgramWithDays>(`/programs/${id}`)
  },

  create(input: CreateProgramInput) {
    return apiRequest<Program>('/programs', { method: 'POST', body: input })
  },

  update(id: string, input: Partial<CreateProgramInput>) {
    return apiRequest<Program>(`/programs/${id}`, { method: 'PATCH', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/programs/${id}`, { method: 'DELETE' })
  },

  addDay(programId: string, input: CreateProgramDayInput) {
    return apiRequest<ProgramDay>(`/programs/${programId}/days`, {
      method: 'POST',
      body: input,
    })
  },

  updateDay(dayId: string, input: UpdateProgramDayInput) {
    return apiRequest<ProgramDay>(`/programs/days/${dayId}`, {
      method: 'PATCH',
      body: input,
    })
  },

  removeDay(dayId: string) {
    return apiRequest<{ deleted: boolean }>(`/programs/days/${dayId}`, {
      method: 'DELETE',
    })
  },

  apply(programId: string, weekStart: string) {
    return apiRequest<ApplyProgramResult>(`/programs/${programId}/apply`, {
      method: 'POST',
      body: { weekStart },
    })
  },
}

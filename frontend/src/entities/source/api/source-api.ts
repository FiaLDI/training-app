import { apiRequest } from '@/shared/api/client'

import type {
  CreateSourceInput,
  CreateTimecodeInput,
  ExerciseSource,
  ExerciseTimecode,
  ListSourcesResult,
  UpdateTimecodeInput,
} from '../model/types'

export const sourceApi = {
  listByExercise(exerciseId: string) {
    return apiRequest<ListSourcesResult>(
      `/sources?exerciseId=${encodeURIComponent(exerciseId)}&limit=50`,
    )
  },

  create(input: CreateSourceInput) {
    return apiRequest<ExerciseSource>('/sources', { method: 'POST', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/sources/${id}`, { method: 'DELETE' })
  },

  listTimecodes(sourceId: string) {
    return apiRequest<ExerciseTimecode[]>(`/sources/${sourceId}/timecodes`)
  },

  createTimecode(sourceId: string, input: CreateTimecodeInput) {
    return apiRequest<ExerciseTimecode>(`/sources/${sourceId}/timecodes`, {
      method: 'POST',
      body: input,
    })
  },

  updateTimecode(timecodeId: string, input: UpdateTimecodeInput) {
    return apiRequest<ExerciseTimecode>(`/sources/timecodes/${timecodeId}`, {
      method: 'PATCH',
      body: input,
    })
  },

  removeTimecode(timecodeId: string) {
    return apiRequest<{ deleted: boolean }>(`/sources/timecodes/${timecodeId}`, {
      method: 'DELETE',
    })
  },
}

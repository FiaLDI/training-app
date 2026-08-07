import { apiRequest } from '@/shared/api/client'

import type { CreateSourceInput, ExerciseSource, ListSourcesResult } from '../model/types'

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
}

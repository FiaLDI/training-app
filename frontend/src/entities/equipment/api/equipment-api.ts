import { apiRequest } from '@/shared/api/client'

import type { CreateEquipmentInput, Equipment, ListEquipmentResult } from '../model/types'

export const equipmentApi = {
  list(params: { page?: number; limit?: number; q?: string } = {}) {
    const search = new URLSearchParams()
    if (params.page) search.set('page', String(params.page))
    if (params.limit) search.set('limit', String(params.limit))
    if (params.q) search.set('q', params.q)
    const qs = search.toString()
    return apiRequest<ListEquipmentResult>(`/equipment${qs ? `?${qs}` : ''}`)
  },

  create(input: CreateEquipmentInput) {
    return apiRequest<Equipment>('/equipment', { method: 'POST', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/equipment/${id}`, { method: 'DELETE' })
  },
}

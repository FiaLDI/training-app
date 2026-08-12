import { apiRequest } from '@/shared/api/client'

import type {
  BodyMeasurement,
  CreateBodyMeasurementInput,
  ListBodyMeasurementsResult,
} from '../model/types'

type RequestExtras = {
  timeoutMs?: number
}

export const bodyMeasurementApi = {
  list(params: { from?: string; to?: string } & RequestExtras = {}) {
    const { timeoutMs, ...query } = params
    const search = new URLSearchParams()
    if (query.from) search.set('from', query.from)
    if (query.to) search.set('to', query.to)
    const qs = search.toString()
    return apiRequest<ListBodyMeasurementsResult>(
      `/body-measurements${qs ? `?${qs}` : ''}`,
      { timeoutMs },
    )
  },

  create(input: CreateBodyMeasurementInput, extras: RequestExtras = {}) {
    return apiRequest<BodyMeasurement>('/body-measurements', {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  remove(id: string, extras: RequestExtras = {}) {
    return apiRequest<{ deleted: boolean }>(`/body-measurements/${id}`, {
      method: 'DELETE',
      ...extras,
    })
  },
}

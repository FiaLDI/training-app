import { apiRequest } from '@/shared/api/client'

import type {
  CreateNewsInput,
  ListNewsResult,
  News,
  UpdateNewsInput,
} from '../model/types'

type RequestExtras = {
  skipAuth?: boolean
}

export const newsApi = {
  list(extras: RequestExtras = {}) {
    return apiRequest<ListNewsResult>('/news', { skipAuth: true, ...extras })
  },

  getBySlug(slug: string, extras: RequestExtras = {}) {
    return apiRequest<News>(`/news/${encodeURIComponent(slug)}`, {
      skipAuth: true,
      ...extras,
    })
  },

  create(input: CreateNewsInput) {
    return apiRequest<News>('/news', { method: 'POST', body: input })
  },

  update(id: string, input: UpdateNewsInput) {
    return apiRequest<News>(`/news/${id}`, { method: 'PATCH', body: input })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/news/${id}`, { method: 'DELETE' })
  },
}

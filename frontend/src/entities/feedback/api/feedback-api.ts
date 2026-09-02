import { apiRequest } from '@/shared/api/client'

import type {
  CreateFeedbackInput,
  Feedback,
  ListFeedbackInboxQuery,
  ListFeedbackInboxResult,
  ListFeedbackResult,
  UpdateFeedbackInput,
} from '../model/types'

type RequestExtras = {
  timeoutMs?: number
  skipAuth?: boolean
}

export const feedbackApi = {
  list(extras: RequestExtras = {}) {
    return apiRequest<ListFeedbackResult>('/feedback', extras)
  },

  create(input: CreateFeedbackInput, extras: RequestExtras = {}) {
    return apiRequest<Feedback>('/feedback', {
      method: 'POST',
      body: input,
      ...extras,
    })
  },

  listInbox(query: ListFeedbackInboxQuery = {}, extras: RequestExtras = {}) {
    const search = new URLSearchParams()
    if (query.page) search.set('page', String(query.page))
    if (query.limit) search.set('limit', String(query.limit))
    if (query.q) search.set('q', query.q)
    if (query.status) search.set('status', query.status)
    if (query.priority) search.set('priority', query.priority)
    if (query.category) search.set('category', query.category)
    if (query.sort) search.set('sort', query.sort)
    if (query.order) search.set('order', query.order)
    const qs = search.toString()
    return apiRequest<ListFeedbackInboxResult>(`/feedback/inbox${qs ? `?${qs}` : ''}`, extras)
  },

  update(id: string, input: UpdateFeedbackInput) {
    return apiRequest<Feedback>(`/feedback/${id}`, {
      method: 'PATCH',
      body: input,
    })
  },

  resolve(id: string) {
    return apiRequest<Feedback>(`/feedback/${id}/resolve`, {
      method: 'PATCH',
    })
  },

  remove(id: string) {
    return apiRequest<{ deleted: boolean }>(`/feedback/${id}`, {
      method: 'DELETE',
    })
  },
}

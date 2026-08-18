import { apiRequest } from '@/shared/api/client'

import type {
  CreateFeedbackInput,
  Feedback,
  ListFeedbackResult,
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

  listInbox(extras: RequestExtras = {}) {
    return apiRequest<ListFeedbackResult>('/feedback/inbox', extras)
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

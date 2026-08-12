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
}

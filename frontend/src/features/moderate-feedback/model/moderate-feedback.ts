import { feedbackApi } from '@/entities/feedback/api/feedback-api'
import type {
  Feedback,
  ListFeedbackInboxQuery,
  ListFeedbackInboxResult,
  UpdateFeedbackInput,
} from '@/entities/feedback/model/types'
import { localData } from '@/shared/lib/local-data'

export async function listFeedbackInbox(
  query: ListFeedbackInboxQuery = {},
): Promise<ListFeedbackInboxResult> {
  return feedbackApi.listInbox(query)
}

export async function updateFeedback(id: string, input: UpdateFeedbackInput): Promise<Feedback> {
  const item = await feedbackApi.update(id, input)
  localData.feedbacks.markSynced(id, {
    status: item.status,
    priority: item.priority,
  })
  return item
}

export async function resolveFeedback(id: string): Promise<Feedback> {
  const item = await feedbackApi.resolve(id)
  localData.feedbacks.markSynced(id, { status: item.status, priority: item.priority })
  return item
}

export async function deleteResolvedFeedback(id: string): Promise<void> {
  await feedbackApi.remove(id)
  localData.feedbacks.remove(id)
}

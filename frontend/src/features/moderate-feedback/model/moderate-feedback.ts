import { feedbackApi } from '@/entities/feedback/api/feedback-api'
import type { Feedback } from '@/entities/feedback/model/types'
import { localData } from '@/shared/lib/local-data'

export async function listFeedbackInbox(): Promise<Feedback[]> {
  const { items } = await feedbackApi.listInbox()
  return items
}

export async function resolveFeedback(id: string): Promise<Feedback> {
  const item = await feedbackApi.resolve(id)
  localData.feedbacks.markSynced(id, { status: item.status })
  return item
}

export async function deleteResolvedFeedback(id: string): Promise<void> {
  await feedbackApi.remove(id)
  localData.feedbacks.remove(id)
}

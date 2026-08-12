export type FeedbackCategory = 'bug' | 'idea' | 'other'
export type FeedbackStatus = 'new' | 'read'

export type Feedback = {
  id: string
  userId: string | null
  category: FeedbackCategory
  message: string
  rating: number | null
  status: FeedbackStatus
  clientMeta: Record<string, unknown>
  createdAt: string
}

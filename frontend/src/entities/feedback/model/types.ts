export type FeedbackCategory = 'bug' | 'idea' | 'other'
export type FeedbackStatus = 'new' | 'read'
export type FeedbackSyncStatus = 'pending' | 'synced' | 'error'

export type FeedbackSyncMeta = {
  status: FeedbackSyncStatus
  reason?: 'network' | 'server' | 'timeout'
}

export type Feedback = {
  id: string
  userId: string | null
  category: FeedbackCategory
  message: string
  rating: number | null
  status: FeedbackStatus
  clientMeta: Record<string, unknown>
  createdAt: string
  sync?: FeedbackSyncMeta
}

export type CreateFeedbackInput = {
  id?: string
  category: FeedbackCategory
  message: string
  rating?: number | null
  clientMeta?: Record<string, unknown>
}

export type ListFeedbackResult = {
  items: Feedback[]
}

export type LocalFeedback = Feedback & {
  sync: FeedbackSyncMeta
}

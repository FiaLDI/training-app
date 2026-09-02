export type FeedbackCategory =
  | 'bug'
  | 'idea'
  | 'question'
  | 'feature'
  | 'ui'
  | 'complaint'
  | 'other'
export type FeedbackStatus = 'new' | 'read' | 'resolved'
export type FeedbackPriority = 'low' | 'normal' | 'high'
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
  priority: FeedbackPriority
  clientMeta: Record<string, unknown>
  createdAt: string
  authorEmail?: string | null
  sync?: FeedbackSyncMeta
}

export type CreateFeedbackInput = {
  id?: string
  category: FeedbackCategory
  message: string
  rating?: number | null
  clientMeta?: Record<string, unknown>
}

export type UpdateFeedbackInput = {
  status?: FeedbackStatus
  priority?: FeedbackPriority
}

export type FeedbackInboxSort = 'default' | 'createdAt' | 'priority' | 'status'
export type FeedbackInboxOrder = 'asc' | 'desc'

export type ListFeedbackInboxQuery = {
  page?: number
  limit?: number
  q?: string
  status?: FeedbackStatus
  priority?: FeedbackPriority
  category?: FeedbackCategory
  sort?: FeedbackInboxSort
  order?: FeedbackInboxOrder
}

export type ListFeedbackResult = {
  items: Feedback[]
}

export type ListFeedbackInboxResult = {
  items: Feedback[]
  total: number
  page: number
  limit: number
}

export type LocalFeedback = Feedback & {
  sync: FeedbackSyncMeta
}

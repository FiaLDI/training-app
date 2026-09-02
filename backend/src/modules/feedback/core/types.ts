export const FEEDBACK_CATEGORIES = [
  'bug',
  'idea',
  'question',
  'feature',
  'ui',
  'complaint',
  'other',
] as const
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_STATUSES = ['new', 'read', 'resolved'] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const FEEDBACK_PRIORITIES = ['low', 'normal', 'high'] as const
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number]

export const FEEDBACK_INBOX_SORTS = ['default', 'createdAt', 'priority', 'status'] as const
export type FeedbackInboxSort = (typeof FEEDBACK_INBOX_SORTS)[number]

export const FEEDBACK_INBOX_ORDERS = ['asc', 'desc'] as const
export type FeedbackInboxOrder = (typeof FEEDBACK_INBOX_ORDERS)[number]

export type ListInboxQuery = {
  page: number
  limit: number
  q?: string
  status?: FeedbackStatus
  priority?: FeedbackPriority
  category?: FeedbackCategory
  sort: FeedbackInboxSort
  order: FeedbackInboxOrder
}

export type ListInboxResult = {
  items: Feedback[]
  total: number
  page: number
  limit: number
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
}

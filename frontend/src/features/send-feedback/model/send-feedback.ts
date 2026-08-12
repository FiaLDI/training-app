import { isRetriableWriteError, syncFailReason } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { localData } from '@/shared/lib/local-data'

import { feedbackApi } from '@/entities/feedback/api/feedback-api'
import type {
  CreateFeedbackInput,
  Feedback,
  LocalFeedback,
} from '@/entities/feedback/model/types'

export type SubmitFeedbackResult =
  | { status: 'sent'; item: Feedback }
  | { status: 'queued'; item: LocalFeedback }

function buildClientMeta(mode: 'local' | 'cloud'): Record<string, unknown> {
  return {
    mode,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  }
}

export async function submitFeedback(input: {
  category: CreateFeedbackInput['category']
  message: string
  rating?: number | null
  mode: 'local' | 'cloud'
}): Promise<SubmitFeedbackResult> {
  const id = createLocalId()
  const clientMeta = buildClientMeta(input.mode)
  const payload: CreateFeedbackInput = {
    id,
    category: input.category,
    message: input.message.trim(),
    rating: input.rating ?? null,
    clientMeta,
  }

  const skipAuth = input.mode === 'local'

  try {
    const created = await feedbackApi.create(payload, { skipAuth })
    const local = localData.feedbacks.create({
      ...payload,
      syncStatus: 'synced',
    })
    localData.feedbacks.markSynced(local.id, {
      userId: created.userId,
      createdAt: created.createdAt,
      status: created.status,
      clientMeta: created.clientMeta,
    })
    return { status: 'sent', item: created }
  } catch (error) {
    if (!isRetriableWriteError(error)) throw error
    const queued = localData.feedbacks.create({
      ...payload,
      syncStatus: 'pending',
    })
    localData.feedbacks.markPending(queued.id, syncFailReason(error))
    return { status: 'queued', item: queued }
  }
}

export async function flushPendingFeedback(mode: 'local' | 'cloud'): Promise<number> {
  const pending = localData.feedbacks.listPending()
  if (pending.length === 0) return 0

  const skipAuth = mode === 'local'
  let sent = 0

  for (const item of pending) {
    try {
      const created = await feedbackApi.create(
        {
          id: item.id,
          category: item.category,
          message: item.message,
          rating: item.rating,
          clientMeta: {
            ...item.clientMeta,
            mode: (item.clientMeta.mode as string) ?? mode,
          },
        },
        { skipAuth },
      )
      localData.feedbacks.markSynced(item.id, {
        userId: created.userId,
        createdAt: created.createdAt,
        status: created.status,
        clientMeta: created.clientMeta,
      })
      sent += 1
    } catch (error) {
      if (isRetriableWriteError(error)) {
        localData.feedbacks.markError(item.id, syncFailReason(error))
      } else {
        localData.feedbacks.markError(item.id, 'server')
      }
    }
  }

  return sent
}

export async function listFeedbackForSettings(mode: 'local' | 'cloud'): Promise<Feedback[]> {
  const localItems = localData.feedbacks.list()

  if (mode !== 'cloud') {
    return localItems
  }

  try {
    const { items } = await feedbackApi.list()
    const byId = new Map<string, Feedback>()
    for (const item of items) {
      byId.set(item.id, item)
    }
    for (const local of localItems) {
      if (local.sync.status !== 'synced') {
        byId.set(local.id, local)
      } else if (!byId.has(local.id)) {
        byId.set(local.id, local)
      }
    }
    return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } catch {
    return localItems
  }
}

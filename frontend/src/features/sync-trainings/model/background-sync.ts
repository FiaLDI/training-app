'use client'

import { useSessionStore } from '@/entities/session/model/store'
import { trainingApi } from '@/entities/training/api/training-api'
import { templateApi } from '@/entities/template/api/template-api'
import { ApiError } from '@/shared/api/client'
import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import { listPendingTemplates } from '@/shared/lib/template-sync-meta'
import {
  healSyncedTrainingsMissingContentHash,
  listPendingTrainings,
} from '@/shared/lib/training-sync-meta'

import { deleteOutbox } from './delete-outbox'
import { getPendingSyncSummary } from './pending-summary'
import { syncTemplates } from './sync-templates'
import { syncTrainings } from './sync-trainings'
import { useSyncNoticeStore } from './sync-notice-store'

let flushing = false
let queued = false
let timer: ReturnType<typeof setTimeout> | null = null
let listenersStarted = false
/** While > 0, background flush is deferred (e.g. active workout screen). */
let pauseDepth = 0

const DEBOUNCE_MS = 400
const SYNC_WRITE_TIMEOUT_MS = 12000

function isCloudMode() {
  return useSessionStore.getState().mode === 'cloud'
}

function isBackgroundSyncPaused() {
  return pauseDepth > 0
}

/** Pause background upload while user is in an active workout UI. */
export function pauseBackgroundSync() {
  pauseDepth += 1
  if (timer != null) {
    clearTimeout(timer)
    timer = null
  }
}

export function resumeBackgroundSync() {
  pauseDepth = Math.max(0, pauseDepth - 1)
  if (pauseDepth === 0 && isCloudMode()) {
    requestBackgroundSync()
  }
}

async function refreshStoresFromLocal() {
  const [{ useTrainingStore }, { useTemplateStore }] = await Promise.all([
    import('@/entities/training/model/store'),
    import('@/entities/template/model/store'),
  ])

  const training = useTrainingStore.getState()
  const trainingById = new Map(localData.trainings.list().map((item) => [item.id, item]))
  useTrainingStore.setState({
    items: training.items.map((item) => trainingById.get(item.id) ?? item),
    current: training.current
      ? (localData.trainings.get(training.current.id) ?? training.current)
      : null,
  })

  const template = useTemplateStore.getState()
  const templateById = new Map(localData.templates.list().map((item) => [item.id, item]))
  useTemplateStore.setState({
    items: template.items.map((item) => templateById.get(item.id) ?? item),
    current: template.current
      ? (localData.templates.get(template.current.id) ?? template.current)
      : null,
  })
}

async function flushDeletes() {
  for (const entry of deleteOutbox.list()) {
    try {
      const extras = { timeoutMs: SYNC_WRITE_TIMEOUT_MS }
      if (entry.entity === 'training') {
        await trainingApi.remove(entry.id, extras)
      } else if (entry.entity === 'template') {
        await templateApi.remove(entry.id, extras)
      } else if (entry.entity === 'training-exercise') {
        await trainingApi.removeExercise(entry.id, extras)
      } else if (entry.entity === 'training-set') {
        await trainingApi.removeSet(entry.id, extras)
      } else if (entry.entity === 'template-exercise') {
        await templateApi.removeExercise(entry.id, extras)
      }
      deleteOutbox.dequeue(entry.entity, entry.id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        deleteOutbox.dequeue(entry.entity, entry.id)
        continue
      }
      // keep in outbox for later
    }
  }
}

async function runFlush() {
  if (!isCloudMode()) return
  if (isBackgroundSyncPaused()) {
    queued = true
    return
  }
  if (flushing) {
    queued = true
    return
  }

  flushing = true
  queued = false
  try {
    healSyncedTrainingsMissingContentHash()
    await catalogSync.flush()
    await flushDeletes()

    if (isBackgroundSyncPaused()) {
      queued = true
      return
    }

    const templateIds = listPendingTemplates().map((item) => item.id)
    if (templateIds.length > 0) {
      await syncTemplates(templateIds)
    }

    if (isBackgroundSyncPaused()) {
      queued = true
      return
    }

    const trainingIds = listPendingTrainings().map((item) => item.id)
    if (trainingIds.length > 0) {
      await syncTrainings(trainingIds, undefined, { skipCatalogFlush: true })
    }

    await refreshStoresFromLocal()

    const remaining = getPendingSyncSummary().total + deleteOutbox.list().length
    if (remaining === 0) {
      useSyncNoticeStore.getState().dismissBanner()
    } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
      useSyncNoticeStore.getState().notifySavedLocally()
    } else {
      useSyncNoticeStore.getState().setShowBanner(true)
      useSyncNoticeStore.getState().setMessage(
        'Не всё удалось отправить. Можно повторить позже.',
      )
    }
  } catch {
    useSyncNoticeStore.getState().notifySavedLocally()
  } finally {
    flushing = false
    if (queued && !isBackgroundSyncPaused()) scheduleFlush()
  }
}

function scheduleFlush() {
  if (isBackgroundSyncPaused()) {
    queued = true
    return
  }
  if (timer != null) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void runFlush()
  }, DEBOUNCE_MS)
}

/** Queue a background push of pending local changes (cloud mode only). */
export function requestBackgroundSync() {
  if (typeof window === 'undefined') return
  if (!isCloudMode()) return
  queued = true
  scheduleFlush()
}

/** Call once from the app shell to sync when connectivity returns. */
export function startBackgroundSyncListeners() {
  if (typeof window === 'undefined' || listenersStarted) return
  listenersStarted = true

  window.addEventListener('online', () => {
    requestBackgroundSync()
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestBackgroundSync()
  })

  if (isCloudMode()) requestBackgroundSync()
}

export function afterLocalCloudWrite(options?: { silent?: boolean }) {
  if (!isCloudMode()) return
  const offline = typeof navigator !== 'undefined' && !navigator.onLine
  if (offline && !options?.silent) {
    useSyncNoticeStore.getState().notifySavedLocally()
  }
  requestBackgroundSync()
}

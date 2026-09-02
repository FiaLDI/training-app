'use client'

import { useSessionStore } from '@/entities/session/model/store'
import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import { listPendingTemplates } from '@/shared/lib/template-sync-meta'
import {
  healSyncedTrainingsMissingContentHash,
  listPendingTrainings,
} from '@/shared/lib/training-sync-meta'

import { flushDeletes } from './flush-deletes'
import { syncTemplates } from './sync-templates'
import { syncTrainings } from './sync-trainings'

let flushing = false
let queued = false
let timer: ReturnType<typeof setTimeout> | null = null
let listenersStarted = false
/** While > 0, background flush is deferred (e.g. active workout screen). */
let pauseDepth = 0

const DEBOUNCE_MS = 400

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
  } catch {
    // next flush retries
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

export function afterLocalCloudWrite() {
  if (!isCloudMode()) return
  requestBackgroundSync()
}

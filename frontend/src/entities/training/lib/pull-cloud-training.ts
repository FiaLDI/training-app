import { trainingApi } from '@/entities/training/api/training-api'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import {
  isTrainingPendingSync,
  mirrorTrainingLocally,
} from '@/shared/lib/training-sync-meta'

import { countTrainingSets, shouldKeepLocalOverRemote } from './keep-local-over-remote'

export type PullCloudResult = 'ok' | 'missing' | 'error' | 'skipped'

const MAX_LIST_DETAIL_PULLS = 20
const LIST_PULL_CONCURRENCY = 4

function isCloudMode() {
  return useSessionStore.getState().mode === 'cloud'
}

export function trainingHeaderChanged(local: Training, cloud: Training): boolean {
  return (
    local.status !== cloud.status ||
    local.finishedAt !== cloud.finishedAt ||
    local.startedAt !== cloud.startedAt ||
    local.scheduledAt !== cloud.scheduledAt ||
    local.templateId !== cloud.templateId ||
    local.notes !== cloud.notes
  )
}

/** Pull details when local is missing, empty, header-stale, or still in progress. */
export function trainingNeedsCloudDetails(cloud: Training): boolean {
  const local = localData.trainings.get(cloud.id)
  if (local && isTrainingPendingSync(local)) return false
  if (!local) return true
  if (local.exercises.length === 0) return true
  if (trainingHeaderChanged(local, cloud)) return true
  if (cloud.status === 'in_progress' || local.status === 'in_progress') return true
  if (cloud.status === 'finished' && countTrainingSets(local) === 0) return true
  return false
}

function detailPullScore(cloud: Training): number {
  const local = localData.trainings.get(cloud.id)
  if (!local) return 0
  if (local.exercises.length === 0) return 1
  if (trainingHeaderChanged(local, cloud)) return 2
  if (cloud.status === 'in_progress' || local.status === 'in_progress') return 3
  return 4
}

/**
 * Persist a cloud list row without details and without a contentHash.
 * An empty hash would look "synced" and later get pushed if hydrated from a template.
 */
export function ingestCloudTrainingHeader(cloud: Training) {
  const local = localData.trainings.get(cloud.id)
  if (local) return
  localData.trainings.upsert({
    ...cloud,
    metadata: {
      ...cloud.metadata,
      sync: {
        status: 'synced',
        serverSyncedAt: new Date().toISOString(),
      },
    },
  })
}

export function ingestCloudTrainingHeaders(items: Training[]) {
  for (const item of items) {
    const local = localData.trainings.get(item.id)
    if (local && isTrainingPendingSync(local)) continue
    ingestCloudTrainingHeader(item)
  }
}

export function unionTrainingLists(prev: Training[], incoming: Training[]): Training[] {
  const byId = new Map<string, Training>()
  for (const item of prev) byId.set(item.id, item)
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => {
    const aWhen = a.startedAt ?? a.scheduledAt ?? a.createdAt
    const bWhen = b.startedAt ?? b.scheduledAt ?? b.createdAt
    return bWhen.localeCompare(aWhen)
  })
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  if (items.length === 0) return
  const queue = [...items]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) return
      await fn(item)
    }
  })
  await Promise.all(workers)
}

export async function pullCloudTrainingDetails(
  id: string,
  timeoutMs: number,
): Promise<PullCloudResult> {
  if (!isCloudMode()) return 'skipped'
  try {
    const remote = await trainingApi.getById(id, { timeoutMs })
    const latestLocal = localData.trainings.get(id)
    if (!shouldKeepLocalOverRemote(latestLocal, remote)) {
      const remoteRicher =
        countTrainingSets(remote) > countTrainingSets(latestLocal ?? emptyTraining(id))
      const keepPending = Boolean(
        latestLocal && isTrainingPendingSync(latestLocal) && !remoteRicher,
      )
      mirrorTrainingLocally(remote, keepPending ? 'pending' : 'synced')
    }
    return 'ok'
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return 'missing'
    return 'error'
  }
}

function emptyTraining(id: string): TrainingWithDetails {
  return {
    id,
    templateId: null,
    programId: null,
    programDayId: null,
    status: 'planned',
    scheduledAt: null,
    startedAt: null,
    finishedAt: null,
    notes: null,
    metadata: {},
    createdAt: '',
    groups: [],
    exercises: [],
  }
}

export async function pullCloudTrainingDetailsForList(
  items: Training[],
  timeoutMs: number,
): Promise<void> {
  const toPull = items
    .filter(trainingNeedsCloudDetails)
    .sort((a, b) => detailPullScore(a) - detailPullScore(b))
    .slice(0, MAX_LIST_DETAIL_PULLS)

  await mapPool(toPull, LIST_PULL_CONCURRENCY, async (item) => {
    await pullCloudTrainingDetails(item.id, timeoutMs)
  })
}

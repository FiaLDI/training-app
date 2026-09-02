import { trainingApi } from '@/entities/training/api/training-api'
import type {
  TrainingExercise,
  TrainingExerciseGroup,
  TrainingSet,
  TrainingWithDetails,
} from '@/entities/training/model/types'
import { ApiError } from '@/shared/api/client'
import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import {
  healSyncedTrainingsMissingContentHash,
  listPendingTrainings,
  markTrainingPending,
  markTrainingSyncError,
  markTrainingSynced,
  trainingContentHash,
} from '@/shared/lib/training-sync-meta'

import { adoptRemoteEntityIds } from './adopt-remote-ids'
import { flushDeletes } from './flush-deletes'

export type SyncTrainingProgress = {
  trainingId: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const MAX_STABLE_UPLOAD_ATTEMPTS = 5
const SYNC_WRITE_TIMEOUT_MS = 12000

function stripSyncMeta(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'sync'))
}

const writeExtras = { timeoutMs: SYNC_WRITE_TIMEOUT_MS }

function isIncompleteTemplateSnapshot(training: TrainingWithDetails) {
  return Boolean(training.templateId) && training.exercises.length === 0
}

async function fetchRemoteTraining(trainingId: string): Promise<TrainingWithDetails | null> {
  try {
    return await trainingApi.getById(trainingId, writeExtras)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

async function ensureTrainingShell(
  training: TrainingWithDetails,
  templateId: string | null,
  remote: TrainingWithDetails | null,
) {
  const payload = {
    status: training.status,
    scheduledAt: training.scheduledAt,
    startedAt: training.startedAt,
    finishedAt: training.finishedAt,
    notes: training.notes,
    metadata: stripSyncMeta(training.metadata),
    // Avoid create-with-templateId: server would copy template rows with new ids.
    templateId,
    programId: null as string | null,
    programDayId: null as string | null,
  }

  if (remote) {
    await trainingApi.update(training.id, payload, writeExtras)
    return
  }

  await trainingApi.create(
    {
      id: training.id,
      ...payload,
      // Create without template linkage first so we fully control exercise ids.
      templateId: null,
    },
    writeExtras,
  )
  if (templateId) {
    await trainingApi.update(training.id, { templateId }, writeExtras)
  }
}

async function upsertExercise(
  trainingId: string,
  exercise: TrainingExercise & { sets: TrainingSet[] },
) {
  // Explicit whitelist — group fields are synced via createGroup, not exercise endpoints.
  const updateBody = {
    exerciseOrder: exercise.exerciseOrder,
    targetSets: exercise.targetSets,
    isWarmup: exercise.isWarmup ?? false,
    minReps: exercise.minReps ?? null,
    maxReps: exercise.maxReps ?? null,
    maxWeight: exercise.maxWeight ?? null,
    previousMaxWeight: exercise.previousMaxWeight ?? null,
    restSeconds: exercise.restSeconds ?? null,
    notes: exercise.notes ?? null,
    metadata: exercise.metadata ?? {},
  }

  // Server create is idempotent by id — creates or returns existing.
  await trainingApi.addExercise(
    trainingId,
    {
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      ...updateBody,
    },
    writeExtras,
  )

  try {
    await trainingApi.updateExercise(exercise.id, updateBody, writeExtras)
  } catch (error) {
    // Create already applied fields for new rows; ignore update failures from stale clients/servers.
    if (!(error instanceof ApiError && (error.status === 400 || error.status === 404))) {
      throw error
    }
  }

  for (const set of exercise.sets) {
    await upsertSet(exercise.id, set)
  }
}

async function upsertSet(exerciseId: string, set: TrainingSet) {
  const body = {
    setNumber: set.setNumber,
    weight: set.weight,
    reps: set.reps,
    rir: set.rir,
    rpe: set.rpe,
    completed: set.completed,
    isWarmup: set.isWarmup ?? false,
    metadata: set.metadata,
  }

  await trainingApi.addSet(exerciseId, { id: set.id, ...body }, writeExtras)
  await trainingApi.updateSet(set.id, body, writeExtras)
}

async function upsertTrainingGroup(
  training: TrainingWithDetails,
  group: TrainingExerciseGroup,
) {
  const members = training.exercises
    .filter((item) => item.groupId === group.id)
    .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
  if (members.length < 2) return

  const exerciseIds = members.map((member) => member.id)
  try {
    await trainingApi.createGroup(
      training.id,
      {
        id: group.id,
        exerciseIds,
        type: group.type,
        restSeconds: group.restSeconds,
      },
      writeExtras,
    )
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 400)) throw error
    await trainingApi.createGroup(
      training.id,
      {
        id: group.id,
        exerciseIds: [exerciseIds[0], exerciseIds[1]],
        type: group.type,
        restSeconds: group.restSeconds,
      },
      writeExtras,
    )
    for (let i = 2; i < exerciseIds.length; i += 1) {
      await trainingApi.addExerciseToGroup(group.id, { exerciseId: exerciseIds[i] }, writeExtras)
    }
  }
  await trainingApi.updateGroup(group.id, { restSeconds: group.restSeconds }, writeExtras)
}

/** Push one local snapshot; does not mark synced (caller checks stability). */
async function pushTrainingSnapshot(
  training: TrainingWithDetails,
  remote: TrainingWithDetails | null,
) {
  const templateId =
    training.templateId && localData.templates.get(training.templateId)
      ? training.templateId
      : null

  await ensureTrainingShell(training, templateId, remote)

  for (const exercise of training.exercises) {
    await upsertExercise(training.id, exercise)
  }

  for (const group of training.groups ?? []) {
    await upsertTrainingGroup(training, group)
  }

  // Removals go through deleteOutbox only — never diff-delete remote from a snapshot.
}

/**
 * Upload until local content stops changing mid-flight.
 * Prevents orphan sets logged during sync from being marked synced without POST.
 */
async function uploadTrainingUntilStable(trainingId: string): Promise<'synced' | 'deferred'> {
  for (let attempt = 0; attempt < MAX_STABLE_UPLOAD_ATTEMPTS; attempt += 1) {
    let snapshot = localData.trainings.get(trainingId)
    if (!snapshot) throw new Error('Тренировка не найдена локально')

    if (isIncompleteTemplateSnapshot(snapshot)) {
      markTrainingPending(trainingId, 'queued')
      return 'deferred'
    }

    const remote = await fetchRemoteTraining(snapshot.id)
    if (remote) adoptRemoteEntityIds(snapshot.id, remote)

    snapshot = localData.trainings.get(trainingId)
    if (!snapshot) throw new Error('Тренировка не найдена локально')

    if (isIncompleteTemplateSnapshot(snapshot)) {
      markTrainingPending(trainingId, 'queued')
      return 'deferred'
    }

    const beforeHash = trainingContentHash(snapshot)
    await pushTrainingSnapshot(snapshot, remote)

    const after = localData.trainings.get(trainingId)
    if (!after) throw new Error('Тренировка не найдена локально')

    if (isIncompleteTemplateSnapshot(after)) {
      markTrainingPending(trainingId, 'queued')
      return 'deferred'
    }

    const afterHash = trainingContentHash(after)
    if (afterHash === beforeHash) {
      markTrainingSynced(trainingId, beforeHash)
      return 'synced'
    }
  }

  markTrainingPending(trainingId, 'queued')
  return 'deferred'
}

export async function syncTrainings(
  trainingIds: string[],
  onProgress?: (items: SyncTrainingProgress[]) => void,
  options?: { skipCatalogFlush?: boolean },
): Promise<SyncTrainingProgress[]> {
  healSyncedTrainingsMissingContentHash()
  await flushDeletes()

  const progress: SyncTrainingProgress[] = trainingIds.map((trainingId) => ({
    trainingId,
    status: 'pending',
  }))

  const emit = () => onProgress?.(progress.map((item) => ({ ...item })))

  if (!options?.skipCatalogFlush) {
    await catalogSync.flush()
  }

  for (const item of progress) {
    item.status = 'uploading'
    emit()

    const detailed = localData.trainings.get(item.trainingId)
    if (!detailed) {
      item.status = 'error'
      item.error = 'Тренировка не найдена локально'
      emit()
      continue
    }

    try {
      const outcome = await uploadTrainingUntilStable(item.trainingId)
      item.status = outcome === 'synced' ? 'done' : 'pending'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить'
      markTrainingSyncError(item.trainingId, message)
      item.status = 'error'
      item.error = message
    }
    emit()
  }

  return progress
}

export { listPendingTrainings }

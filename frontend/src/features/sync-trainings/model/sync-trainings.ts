import { trainingApi } from '@/entities/training/api/training-api'
import type {
  TrainingExercise,
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

async function ensureTrainingShell(training: TrainingWithDetails, templateId: string | null) {
  let remote: TrainingWithDetails | null = null
  try {
    remote = await trainingApi.getById(training.id, writeExtras)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }

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
  const updateBody = {
    exerciseOrder: exercise.exerciseOrder,
    targetSets: exercise.targetSets,
    isWarmup: exercise.isWarmup,
    minReps: exercise.minReps,
    maxReps: exercise.maxReps,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
    metadata: exercise.metadata,
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
  // Apply latest fields (create no-ops when the row already exists).
  await trainingApi.updateExercise(exercise.id, updateBody, writeExtras)

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

/** Push one local snapshot; does not mark synced (caller checks stability). */
async function pushTrainingSnapshot(training: TrainingWithDetails) {
  const templateId =
    training.templateId && localData.templates.get(training.templateId)
      ? training.templateId
      : null

  await ensureTrainingShell(training, templateId)

  for (const exercise of training.exercises) {
    await upsertExercise(training.id, exercise)
  }

  // Removals go through deleteOutbox only — never diff-delete remote from a snapshot.
}

/**
 * Upload until local content stops changing mid-flight.
 * Prevents orphan sets logged during sync from being marked synced without POST.
 */
async function uploadTrainingUntilStable(trainingId: string) {
  for (let attempt = 0; attempt < MAX_STABLE_UPLOAD_ATTEMPTS; attempt += 1) {
    const snapshot = localData.trainings.get(trainingId)
    if (!snapshot) throw new Error('Тренировка не найдена локально')

    const beforeHash = trainingContentHash(snapshot)
    await pushTrainingSnapshot(snapshot)

    const after = localData.trainings.get(trainingId)
    if (!after) throw new Error('Тренировка не найдена локально')

    const afterHash = trainingContentHash(after)
    if (afterHash === beforeHash) {
      markTrainingSynced(trainingId, beforeHash)
      return
    }
  }

  markTrainingPending(trainingId, 'queued')
}

export async function syncTrainings(
  trainingIds: string[],
  onProgress?: (items: SyncTrainingProgress[]) => void,
  options?: { skipCatalogFlush?: boolean },
): Promise<SyncTrainingProgress[]> {
  healSyncedTrainingsMissingContentHash()

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
      await uploadTrainingUntilStable(item.trainingId)
      item.status = 'done'
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

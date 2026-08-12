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
  listPendingTrainings,
  markTrainingSyncError,
  markTrainingSynced,
  mirrorTrainingLocally,
} from '@/shared/lib/training-sync-meta'

export type SyncTrainingProgress = {
  trainingId: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function stripSyncMeta(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'sync'))
}

async function ensureTrainingShell(training: TrainingWithDetails, templateId: string | null) {
  let remote: TrainingWithDetails | null = null
  try {
    remote = await trainingApi.getById(training.id)
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
    await trainingApi.update(training.id, payload)
    return
  }

  await trainingApi.create({
    id: training.id,
    ...payload,
    // Create without template linkage first so we fully control exercise ids.
    templateId: null,
  })
  if (templateId) {
    await trainingApi.update(training.id, { templateId })
  }
}

async function upsertExercise(
  trainingId: string,
  exercise: TrainingExercise & { sets: TrainingSet[] },
) {
  const body = {
    exerciseId: exercise.exerciseId,
    exerciseOrder: exercise.exerciseOrder,
    targetSets: exercise.targetSets,
    isWarmup: exercise.isWarmup,
    minReps: exercise.minReps,
    maxReps: exercise.maxReps,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
    metadata: exercise.metadata,
  }

  try {
    await trainingApi.updateExercise(exercise.id, body)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    await trainingApi.addExercise(trainingId, { id: exercise.id, ...body })
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

  try {
    await trainingApi.updateSet(set.id, body)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    await trainingApi.addSet(exerciseId, { id: set.id, ...body })
  }
}

async function reconcileRemovals(training: TrainingWithDetails) {
  const remote = await trainingApi.getById(training.id)
  const localExerciseIds = new Set(training.exercises.map((item) => item.id))
  const localSetIds = new Set(
    training.exercises.flatMap((exercise) => exercise.sets.map((set) => set.id)),
  )

  for (const exercise of remote.exercises) {
    for (const set of exercise.sets) {
      if (!localSetIds.has(set.id)) {
        await trainingApi.removeSet(set.id)
      }
    }
    if (!localExerciseIds.has(exercise.id)) {
      await trainingApi.removeExercise(exercise.id)
    }
  }
}

export async function syncTrainings(
  trainingIds: string[],
  onProgress?: (items: SyncTrainingProgress[]) => void,
  options?: { skipCatalogFlush?: boolean },
): Promise<SyncTrainingProgress[]> {
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
      await uploadTraining(detailed)
      markTrainingSynced(detailed.id)
      item.status = 'done'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить'
      markTrainingSyncError(detailed.id, message)
      item.status = 'error'
      item.error = message
    }
    emit()
  }

  return progress
}

async function uploadTraining(training: TrainingWithDetails) {
  const templateId =
    training.templateId && localData.templates.get(training.templateId)
      ? training.templateId
      : null

  await ensureTrainingShell(training, templateId)

  for (const exercise of training.exercises) {
    await upsertExercise(training.id, exercise)
  }

  await reconcileRemovals(training)

  const refreshed = localData.trainings.get(training.id)
  if (refreshed) mirrorTrainingLocally(refreshed, 'synced')
}

export { listPendingTrainings }

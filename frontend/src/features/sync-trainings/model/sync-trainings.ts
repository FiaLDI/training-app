import { trainingApi } from '@/entities/training/api/training-api'
import type { TrainingWithDetails } from '@/entities/training/model/types'
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
  // Keep templateId only if that plan exists locally (synced or about to sync)
  const templateId =
    training.templateId && localData.templates.get(training.templateId)
      ? training.templateId
      : null

  await trainingApi.create({
    id: training.id,
    templateId,
    programId: null,
    programDayId: null,
    status: training.status,
    scheduledAt: training.scheduledAt,
    startedAt: training.startedAt,
    finishedAt: training.finishedAt,
    notes: training.notes,
    metadata: Object.fromEntries(
      Object.entries(training.metadata).filter(([key]) => key !== 'sync'),
    ),
  })

  for (const exercise of training.exercises) {
    await trainingApi.addExercise(training.id, {
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseOrder: exercise.exerciseOrder,
      targetSets: exercise.targetSets,
      isWarmup: exercise.isWarmup,
      minReps: exercise.minReps,
      maxReps: exercise.maxReps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      metadata: exercise.metadata,
    })
    for (const set of exercise.sets) {
      await trainingApi.addSet(exercise.id, {
        id: set.id,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        rpe: set.rpe,
        completed: set.completed,
        metadata: set.metadata,
      })
    }
  }

  const refreshed = localData.trainings.get(training.id)
  if (refreshed) mirrorTrainingLocally(refreshed, 'synced')
}

export { listPendingTrainings }

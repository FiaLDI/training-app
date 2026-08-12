import type {
  Training,
  TrainingSyncMeta,
  TrainingWithDetails,
} from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'

export function getTrainingSyncMeta(
  metadata: Record<string, unknown> | undefined,
): TrainingSyncMeta | null {
  const sync = metadata?.sync
  if (!sync || typeof sync !== 'object') return null
  const status = (sync as TrainingSyncMeta).status
  if (status !== 'pending' && status !== 'synced' && status !== 'error') return null
  return sync as TrainingSyncMeta
}

export function isTrainingPendingSync(training: Training): boolean {
  const sync = getTrainingSyncMeta(training.metadata)
  return !sync || sync.status !== 'synced'
}

export function markTrainingPending(
  trainingId: string,
  reason: NonNullable<TrainingSyncMeta['reason']>,
  error?: string,
): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'pending',
    reason,
    failedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  }
  return localData.trainings.update(trainingId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTrainingSynced(trainingId: string): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'synced',
    serverSyncedAt: new Date().toISOString(),
  }
  return localData.trainings.update(trainingId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTrainingSyncError(trainingId: string, error: string): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'error',
    error,
    failedAt: new Date().toISOString(),
    reason: getTrainingSyncMeta(current.metadata)?.reason,
  }
  return localData.trainings.update(trainingId, {
    metadata: { ...current.metadata, sync },
  })
}

export function mirrorTrainingLocally(
  training: TrainingWithDetails,
  syncStatus: TrainingSyncMeta['status'] = 'synced',
): TrainingWithDetails {
  const sync: TrainingSyncMeta =
    syncStatus === 'synced'
      ? { status: 'synced', serverSyncedAt: new Date().toISOString() }
      : {
          status: syncStatus,
          reason: syncStatus === 'pending' ? 'network' : undefined,
        }

  localData.trainings.upsert({
    id: training.id,
    templateId: training.templateId,
    programId: training.programId,
    programDayId: training.programDayId,
    status: training.status,
    scheduledAt: training.scheduledAt,
    startedAt: training.startedAt,
    finishedAt: training.finishedAt,
    notes: training.notes,
    metadata: { ...training.metadata, sync },
    createdAt: training.createdAt,
  })

  for (const exercise of training.exercises) {
    localData.trainings.upsertExercise({
      id: exercise.id,
      trainingId: exercise.trainingId,
      exerciseId: exercise.exerciseId,
      exerciseOrder: exercise.exerciseOrder,
      targetSets: exercise.targetSets,
      isWarmup: exercise.isWarmup,
      minReps: exercise.minReps,
      maxReps: exercise.maxReps,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      metadata: exercise.metadata ?? {},
    })
    for (const set of exercise.sets) {
      localData.trainings.upsertSet({
        id: set.id,
        trainingExerciseId: set.trainingExerciseId,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rir: set.rir,
        rpe: set.rpe,
        completed: set.completed,
        isWarmup: set.isWarmup ?? false,
        metadata: set.metadata ?? {},
        createdAt: set.createdAt,
      })
    }
  }

  return localData.trainings.get(training.id) ?? { ...training, metadata: { ...training.metadata, sync } }
}

export function listPendingTrainings(): TrainingWithDetails[] {
  return localData.trainings
    .list()
    .filter(isTrainingPendingSync)
    .map((item) => localData.trainings.get(item.id))
    .filter((item): item is TrainingWithDetails => item != null)
    .sort((a, b) => {
      const aWhen = a.startedAt ?? a.scheduledAt ?? a.createdAt
      const bWhen = b.startedAt ?? b.scheduledAt ?? b.createdAt
      return bWhen.localeCompare(aWhen)
    })
}

export function syncReasonLabel(reason?: TrainingSyncMeta['reason']): string {
  switch (reason) {
    case 'local_mode':
      return 'локальный режим'
    case 'queued':
      return 'ожидает отправки'
    case 'timeout':
      return 'не успели отправить'
    case 'network':
      return 'нет сети'
    case 'server':
      return 'ошибка сервера'
    default:
      return 'не на сервере'
  }
}

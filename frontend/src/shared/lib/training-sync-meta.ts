import type {
  Training,
  TrainingSyncMeta,
  TrainingWithDetails,
} from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'

const HEAL_CONTENT_HASH_KEY = 'ironlog:sync-heal-content-hash-v1'

export function getTrainingSyncMeta(
  metadata: Record<string, unknown> | undefined,
): TrainingSyncMeta | null {
  const sync = metadata?.sync
  if (!sync || typeof sync !== 'object') return null
  const status = (sync as TrainingSyncMeta).status
  if (status !== 'pending' && status !== 'synced' && status !== 'error') return null
  return sync as TrainingSyncMeta
}

/** Stable fingerprint of uploadable training content (excludes sync meta). */
export function trainingContentHash(training: TrainingWithDetails): string {
  const payload = {
    id: training.id,
    templateId: training.templateId,
    programId: training.programId,
    programDayId: training.programDayId,
    status: training.status,
    scheduledAt: training.scheduledAt,
    startedAt: training.startedAt,
    finishedAt: training.finishedAt,
    notes: training.notes,
    exercises: [...training.exercises]
      .map((exercise) => ({
        id: exercise.id,
        exerciseId: exercise.exerciseId,
        exerciseOrder: exercise.exerciseOrder,
        targetSets: exercise.targetSets,
        isWarmup: exercise.isWarmup,
        minReps: exercise.minReps,
        maxReps: exercise.maxReps,
        maxWeight: exercise.maxWeight ?? null,
        previousMaxWeight: exercise.previousMaxWeight ?? null,
        restSeconds: exercise.restSeconds,
        notes: exercise.notes,
        sets: [...exercise.sets]
          .map((set) => ({
            id: set.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            rir: set.rir,
            rpe: set.rpe,
            completed: set.completed,
            isWarmup: set.isWarmup ?? false,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  }
  return JSON.stringify(payload)
}

export function isTrainingPendingSync(training: Training): boolean {
  const sync = getTrainingSyncMeta(training.metadata)
  if (!sync || sync.status !== 'synced') return true
  if (!sync.contentHash) return false
  const detailed = localData.trainings.get(training.id)
  if (!detailed) return false
  return trainingContentHash(detailed) !== sync.contentHash
}

export function markTrainingPending(
  trainingId: string,
  reason: NonNullable<TrainingSyncMeta['reason']>,
  error?: string,
): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const previous = getTrainingSyncMeta(current.metadata)
  const sync: TrainingSyncMeta = {
    status: 'pending',
    reason,
    failedAt: new Date().toISOString(),
    ...(previous?.contentHash ? { contentHash: previous.contentHash } : {}),
    ...(error ? { error } : {}),
  }
  return localData.trainings.update(trainingId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTrainingSynced(
  trainingId: string,
  contentHash?: string,
): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const hash = contentHash ?? trainingContentHash(current)
  const sync: TrainingSyncMeta = {
    status: 'synced',
    serverSyncedAt: new Date().toISOString(),
    contentHash: hash,
  }
  return localData.trainings.update(trainingId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTrainingSyncError(trainingId: string, error: string): Training | null {
  const current = localData.trainings.get(trainingId)
  if (!current) return null
  const previous = getTrainingSyncMeta(current.metadata)
  const sync: TrainingSyncMeta = {
    status: 'error',
    error,
    failedAt: new Date().toISOString(),
    reason: previous?.reason,
    ...(previous?.contentHash ? { contentHash: previous.contentHash } : {}),
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
      ? {
          status: 'synced',
          serverSyncedAt: new Date().toISOString(),
          contentHash: trainingContentHash(training),
        }
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
      maxWeight: exercise.maxWeight ?? null,
      previousMaxWeight: exercise.previousMaxWeight ?? null,
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

/**
 * One-time: trainings marked synced before contentHash existed may hide
 * orphan local sets — re-queue those that have local exercises/sets.
 */
export function healSyncedTrainingsMissingContentHash(): number {
  if (typeof window === 'undefined') return 0
  try {
    if (localStorage.getItem(HEAL_CONTENT_HASH_KEY)) return 0
  } catch {
    // ignore storage errors
  }

  let count = 0
  for (const training of localData.trainings.list()) {
    const sync = getTrainingSyncMeta(training.metadata)
    if (sync?.status !== 'synced' || sync.contentHash) continue

    const detailed = localData.trainings.get(training.id)
    if (!detailed) continue

    const hasLocalDetail =
      detailed.exercises.length > 0 ||
      detailed.exercises.some((exercise) => exercise.sets.length > 0)

    if (hasLocalDetail) {
      markTrainingPending(training.id, 'queued')
      count += 1
    } else {
      // Cloud list shell with no local detail — stamp hash so it stays trusted.
      markTrainingSynced(training.id, trainingContentHash(detailed))
    }
  }

  try {
    localStorage.setItem(HEAL_CONTENT_HASH_KEY, '1')
  } catch {
    // ignore
  }
  return count
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

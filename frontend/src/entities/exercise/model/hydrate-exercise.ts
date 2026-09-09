import type { Exercise } from './types'

/** Fill isSystem for records stored before the DB flag existed. */
export function hydrateExercise(exercise: Exercise): Exercise {
  if (typeof exercise.isSystem === 'boolean') return exercise
  const catalogSyncedAt = exercise.metadata?.catalogSyncedAt
  const looksLikeSyncedCatalog =
    exercise.userId == null && typeof catalogSyncedAt === 'string' && catalogSyncedAt.length > 0
  return { ...exercise, isSystem: looksLikeSyncedCatalog }
}

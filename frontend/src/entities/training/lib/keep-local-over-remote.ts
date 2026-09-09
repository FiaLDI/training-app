import type { TrainingWithDetails } from '@/entities/training/model/types'

export function countTrainingSets(training: TrainingWithDetails) {
  return training.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

/**
 * Prefer in-progress local detail over a poorer cloud snapshot (empty GET).
 * A hydrated template (exercises, no sets) must not beat remote work with sets.
 */
export function shouldKeepLocalOverRemote(
  local: TrainingWithDetails | null,
  remote: TrainingWithDetails,
): boolean {
  if (!local) return false
  const localSets = countTrainingSets(local)
  const remoteSets = countTrainingSets(remote)
  if (remoteSets > localSets) return false
  if (localSets > remoteSets) return true
  if (local.exercises.length > remote.exercises.length) return true
  return false
}

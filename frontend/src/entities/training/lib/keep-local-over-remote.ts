import type { TrainingWithDetails } from '@/entities/training/model/types'

function countSets(training: TrainingWithDetails) {
  return training.exercises.reduce((total, exercise) => total + exercise.sets.length, 0)
}

/** Prefer in-progress local detail over a poorer cloud snapshot (empty shell / stale GET). */
export function shouldKeepLocalOverRemote(
  local: TrainingWithDetails | null,
  remote: TrainingWithDetails,
): boolean {
  if (!local) return false
  const localSets = countSets(local)
  const remoteSets = countSets(remote)
  if (localSets > remoteSets) return true
  if (local.exercises.length > remote.exercises.length) return true
  return false
}

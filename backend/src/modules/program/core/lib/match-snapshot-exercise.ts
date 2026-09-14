import { Exercise } from '../../../exercise/core/types'
import { normalizeExerciseName } from './normalize-exercise-name'
import type { SnapshotExercise } from './program-snapshot'

export function matchSnapshotExercise(
  item: SnapshotExercise,
  catalog: Exercise[],
): Exercise | null {
  if (item.exerciseId) {
    const byId = catalog.find((exercise) => exercise.id === item.exerciseId)
    if (byId) return byId
  }

  const target = normalizeExerciseName(item.exerciseName)
  if (!target) return null
  return catalog.find((exercise) => normalizeExerciseName(exercise.name) === target) ?? null
}

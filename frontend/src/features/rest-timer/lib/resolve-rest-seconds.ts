import type { TrainingExercise } from '@/entities/training/model/types'

export function resolveRestSeconds(
  exercise: Pick<TrainingExercise, 'restSeconds'>,
  defaultRestSeconds: number,
  groupRestSeconds?: number | null,
): number {
  if (groupRestSeconds != null && groupRestSeconds > 0) {
    return groupRestSeconds
  }
  if (exercise.restSeconds != null && exercise.restSeconds > 0) {
    return exercise.restSeconds
  }
  return defaultRestSeconds
}

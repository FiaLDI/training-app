import type { TrainingExercise } from '@/entities/training/model/types'

export function resolveRestSeconds(
  exercise: Pick<TrainingExercise, 'restSeconds'>,
  defaultRestSeconds: number,
): number {
  if (exercise.restSeconds != null && exercise.restSeconds > 0) {
    return exercise.restSeconds
  }
  return defaultRestSeconds
}

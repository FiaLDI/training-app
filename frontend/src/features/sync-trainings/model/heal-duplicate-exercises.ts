import { localData } from '@/shared/lib/local-data'
import { markTrainingPending } from '@/shared/lib/training-sync-meta'

import { deleteOutbox } from './delete-outbox'

/** Drop copied rows that share catalog exercise + order; enqueue remote deletes. */
export function healDuplicateTrainingExercises(trainingId?: string): number {
  const trainings = trainingId
    ? localData.trainings.list().filter((item) => item.id === trainingId)
    : localData.trainings.list()

  let count = 0
  for (const training of trainings) {
    const removed = localData.trainings.dedupeExercises(training.id)
    if (removed.length === 0) continue
    for (const id of removed) deleteOutbox.enqueue('training-exercise', id)
    markTrainingPending(training.id, 'queued')
    count += removed.length
  }
  return count
}

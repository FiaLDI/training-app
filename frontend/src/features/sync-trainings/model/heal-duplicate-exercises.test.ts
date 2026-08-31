import { localData } from '@/shared/lib/local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'
import { getTrainingSyncMeta } from '@/shared/lib/training-sync-meta'

import { deleteOutbox } from './delete-outbox'
import { healDuplicateTrainingExercises } from './heal-duplicate-exercises'

describe('healDuplicateTrainingExercises', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
    deleteOutbox.clear()
  })

  it('enqueues remote deletes for copied rows and marks the training pending', () => {
    const training = localData.trainings.create({
      id: 'tr-heal',
      status: 'planned',
      scheduledAt: '2026-08-31T12:00:00.000Z',
      metadata: { sync: { status: 'synced', contentHash: 'x' } },
    })
    localData.trainings.addExercise(training.id, {
      id: 'keep',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addExercise(training.id, {
      id: 'dup',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })

    localData.trainings.addSet('keep', { id: 'set-1', setNumber: 1, reps: 8 })

    expect(healDuplicateTrainingExercises(training.id)).toBe(1)
    expect(deleteOutbox.list()).toEqual([{ entity: 'training-exercise', id: 'dup' }])
    expect(getTrainingSyncMeta(localData.trainings.get(training.id)?.metadata)?.status).toBe(
      'pending',
    )
    expect(localData.trainings.get(training.id)?.exercises).toHaveLength(1)
  })
})

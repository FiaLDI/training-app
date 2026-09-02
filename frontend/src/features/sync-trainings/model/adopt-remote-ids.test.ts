import { describe, expect, it } from 'vitest'

import { localData } from '@/shared/lib/local-data'
import type { TrainingWithDetails } from '@/entities/training/model/types'

import { adoptRemoteEntityIds } from './adopt-remote-ids'

describe('adoptRemoteEntityIds', () => {
  it('rewrites local exercise and group ids to matching remote rows', () => {
    const training = localData.trainings.create({
      id: 'tr-1',
      status: 'in_progress',
      startedAt: '2026-09-02T10:00:00.000Z',
    })
    localData.trainings.addExercise(training.id, {
      id: 'local-a',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addExercise(training.id, {
      id: 'local-b',
      exerciseId: 'ex-b',
      exerciseOrder: 1,
      targetSets: 3,
    })
    localData.trainings.addSet('local-a', { id: 'set-1', setNumber: 1, reps: 8 })
    localData.trainings.createGroup(training.id, {
      id: 'local-g',
      exerciseIds: ['local-a', 'local-b'],
    })

    const remote: TrainingWithDetails = {
      ...localData.trainings.get(training.id)!,
      groups: [
        {
          id: 'remote-g',
          trainingId: training.id,
          type: 'superset',
          groupOrder: 0,
          restSeconds: null,
          metadata: {},
        },
      ],
      exercises: [
        {
          ...localData.trainings.get(training.id)!.exercises[0],
          id: 'remote-a',
          groupId: 'remote-g',
          sets: [],
        },
        {
          ...localData.trainings.get(training.id)!.exercises[1],
          id: 'remote-b',
          groupId: 'remote-g',
          sets: [],
        },
      ],
    }

    adoptRemoteEntityIds(training.id, remote)

    const after = localData.trainings.get(training.id)
    expect(after?.exercises.map((item) => item.id)).toEqual(['remote-a', 'remote-b'])
    expect(after?.exercises[0].sets[0].trainingExerciseId).toBe('remote-a')
    expect(after?.groups.map((item) => item.id)).toEqual(['remote-g'])
    expect(after?.exercises.every((item) => item.groupId === 'remote-g')).toBe(true)
  })
})

import { matchSnapshotExercise } from './match-snapshot-exercise'
import type { Exercise } from '../../../exercise/core/types'
import type { SnapshotExercise } from './program-snapshot'

const squat: Exercise = {
  id: 'ex-squat',
  userId: null,
  isSystem: true,
  name: 'Приседания со штангой',
  description: null,
  muscleGroup: 'квадрицепс',
  difficulty: null,
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function item(partial: Partial<SnapshotExercise>): SnapshotExercise {
  return {
    exerciseName: 'Приседания со штангой',
    exerciseOrder: 0,
    targetSets: 3,
    ...partial,
  }
}

describe('matchSnapshotExercise', () => {
  it('matches by visible id first', () => {
    const found = matchSnapshotExercise(item({ exerciseId: 'ex-squat', exerciseName: 'other' }), [
      squat,
    ])
    expect(found?.id).toBe('ex-squat')
  })

  it('falls back to normalized name', () => {
    const found = matchSnapshotExercise(item({ exerciseName: 'приседания  СО штангой' }), [squat])
    expect(found?.id).toBe('ex-squat')
  })

  it('returns null when nothing matches', () => {
    expect(matchSnapshotExercise(item({ exerciseName: 'Становая тяга' }), [squat])).toBeNull()
  })
})

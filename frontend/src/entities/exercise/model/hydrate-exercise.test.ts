import { describe, expect, it } from 'vitest'

import { hydrateExercise } from './hydrate-exercise'
import type { Exercise } from './types'

function base(partial: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex-1',
    userId: null,
    isSystem: undefined as unknown as boolean,
    name: 'Bench',
    description: null,
    muscleGroup: null,
    difficulty: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('hydrateExercise', () => {
  it('keeps an explicit isSystem flag', () => {
    expect(hydrateExercise(base({ isSystem: false })).isSystem).toBe(false)
    expect(hydrateExercise(base({ isSystem: true })).isSystem).toBe(true)
  })

  it('treats unsynced local rows as custom', () => {
    const row = base({ isSystem: undefined as unknown as boolean, metadata: {} })
    delete (row as { isSystem?: boolean }).isSystem
    expect(hydrateExercise(row as Exercise).isSystem).toBe(false)
  })

  it('treats synced catalog snapshots without the flag as system', () => {
    const row = {
      ...base(),
      metadata: { catalogSyncedAt: '2026-01-01T00:00:00.000Z' },
    }
    delete (row as { isSystem?: boolean }).isSystem
    expect(hydrateExercise(row as Exercise).isSystem).toBe(true)
  })
})

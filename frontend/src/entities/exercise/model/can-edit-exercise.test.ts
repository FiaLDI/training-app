import { describe, expect, it } from 'vitest'

import { canEditExercise } from './can-edit-exercise'
import type { Exercise } from './types'

const admin = {
  id: 'admin-1',
  email: 'a@x',
  username: 'a',
  role: 'admin' as const,
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
}
const owner = {
  id: 'user-1',
  email: 'u@x',
  username: 'u',
  role: 'user' as const,
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
}

function exercise(partial: Partial<Exercise>): Exercise {
  return {
    id: 'ex-1',
    userId: null,
    isSystem: false,
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

describe('canEditExercise', () => {
  it('allows only admin to edit system exercises', () => {
    const item = exercise({ isSystem: true, userId: null })
    expect(canEditExercise(item, admin)).toBe(true)
    expect(canEditExercise(item, owner)).toBe(false)
  })

  it('allows only the owner to edit custom exercises', () => {
    const item = exercise({ isSystem: false, userId: owner.id })
    expect(canEditExercise(item, owner)).toBe(true)
    expect(canEditExercise(item, admin)).toBe(false)
  })
})

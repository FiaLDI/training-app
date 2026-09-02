import { describe, expect, it } from 'vitest'

import type { TrainingWithDetails } from '../model/types'

import { shouldKeepLocalOverRemote } from './keep-local-over-remote'

function training(
  exercises: Array<{ sets: unknown[] }>,
): TrainingWithDetails {
  return {
    id: 'tr-1',
    templateId: null,
    programId: null,
    programDayId: null,
    status: 'in_progress',
    scheduledAt: null,
    startedAt: null,
    finishedAt: null,
    notes: null,
    metadata: {},
    createdAt: '2026-09-02T00:00:00.000Z',
    groups: [],
    exercises: exercises as TrainingWithDetails['exercises'],
  }
}

describe('shouldKeepLocalOverRemote', () => {
  it('keeps local when it has more sets than remote', () => {
    const local = training([{ sets: [{}] }, { sets: [{}] }])
    const remote = training([{ sets: [] }])
    expect(shouldKeepLocalOverRemote(local, remote)).toBe(true)
  })

  it('mirrors remote when local is an empty shell', () => {
    expect(shouldKeepLocalOverRemote(training([]), training([{ sets: [] }]))).toBe(false)
  })
})

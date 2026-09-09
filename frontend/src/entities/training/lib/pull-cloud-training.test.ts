import { afterEach, describe, expect, it, vi } from 'vitest'

import { trainingApi } from '@/entities/training/api/training-api'
import { useSessionStore } from '@/entities/session/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import {
  getTrainingSyncMeta,
  isTrainingPendingSync,
} from '@/shared/lib/training-sync-meta'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'

import {
  ingestCloudTrainingHeader,
  pullCloudTrainingDetails,
  trainingNeedsCloudDetails,
  unionTrainingLists,
} from './pull-cloud-training'

function cloudSession() {
  useSessionStore.setState({
    mode: 'cloud',
    user: {
      id: 'user-1',
      email: 'a@b.c',
      username: 'a',
      metadata: {},
      createdAt: '2026-09-02T00:00:00.000Z',
    },
    accessToken: 'token',
    hydrated: true,
  })
}

function header(overrides: Partial<Training> = {}): Training {
  return {
    id: 'tr-1',
    templateId: 'tpl-1',
    programId: null,
    programDayId: null,
    status: 'finished',
    scheduledAt: null,
    startedAt: '2026-09-02T10:00:00.000Z',
    finishedAt: '2026-09-02T11:00:00.000Z',
    notes: null,
    metadata: {},
    createdAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  }
}

function detailed(overrides: Partial<TrainingWithDetails> = {}): TrainingWithDetails {
  return {
    ...header(),
    groups: [],
    exercises: [
      {
        id: 'ex-row-1',
        trainingId: 'tr-1',
        exerciseId: 'ex-a',
        exerciseOrder: 0,
        targetSets: 3,
        isWarmup: false,
        minReps: null,
        maxReps: null,
        maxWeight: null,
        previousMaxWeight: null,
        restSeconds: null,
        notes: null,
        groupId: null,
        positionInGroup: null,
        metadata: {},
        sets: [
          {
            id: 'set-1',
            trainingExerciseId: 'ex-row-1',
            setNumber: 1,
            weight: 80,
            reps: 8,
            rir: null,
            rpe: null,
            completed: true,
            isWarmup: false,
            metadata: {},
            createdAt: '2026-09-02T10:30:00.000Z',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('pull-cloud-training', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEntityStores()
  })

  it('stores a list header without a content hash so it is not queued for push', () => {
    ingestCloudTrainingHeader(header())
    const local = localData.trainings.get('tr-1')
    expect(local).not.toBeNull()
    expect(local?.exercises).toEqual([])
    expect(getTrainingSyncMeta(local?.metadata)?.contentHash).toBeUndefined()
    expect(isTrainingPendingSync(local!)).toBe(false)
    expect(trainingNeedsCloudDetails(header())).toBe(true)
  })

  it('mirrors richer remote details over an empty local shell', async () => {
    cloudSession()
    ingestCloudTrainingHeader(header())
    vi.spyOn(trainingApi, 'getById').mockResolvedValue(detailed())

    await expect(pullCloudTrainingDetails('tr-1', 4000)).resolves.toBe('ok')
    const local = localData.trainings.get('tr-1')
    expect(local?.exercises[0]?.sets).toHaveLength(1)
    expect(getTrainingSyncMeta(local?.metadata)?.status).toBe('synced')
    expect(getTrainingSyncMeta(local?.metadata)?.contentHash).toBeTruthy()
    expect(isTrainingPendingSync(local!)).toBe(false)
  })

  it('returns missing on 404 and error on network failure', async () => {
    cloudSession()
    vi.spyOn(trainingApi, 'getById').mockRejectedValueOnce(new ApiError(404, 'missing'))
    await expect(pullCloudTrainingDetails('tr-1', 4000)).resolves.toBe('missing')

    vi.spyOn(trainingApi, 'getById').mockRejectedValueOnce(new Error('offline'))
    await expect(pullCloudTrainingDetails('tr-1', 4000)).resolves.toBe('error')
  })

  it('unions cloud pages without dropping older local rows', () => {
    const prev = [header({ id: 'old', startedAt: '2026-08-01T10:00:00.000Z' })]
    const incoming = [header({ id: 'new', startedAt: '2026-09-02T10:00:00.000Z' })]
    expect(unionTrainingLists(prev, incoming).map((item) => item.id)).toEqual(['new', 'old'])
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { trainingApi } from '@/entities/training/api/training-api'
import { useSessionStore } from '@/entities/session/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { localData } from '@/shared/lib/local-data'
import {
  getTrainingSyncMeta,
  isTrainingPendingSync,
  trainingContentHash,
} from '@/shared/lib/training-sync-meta'
import type { Training, TrainingWithDetails } from '@/entities/training/model/types'

import { useTrainingStore } from './store'

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

function listItem(overrides: Partial<Training> = {}): Training {
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
    ...listItem(),
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

describe('cloud fetchList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEntityStores()
  })

  it('pulls details for a cloud training missing locally', async () => {
    cloudSession()
    vi.spyOn(trainingApi, 'list').mockResolvedValue({
      items: [listItem()],
      total: 1,
      page: 1,
      limit: 100,
    })
    vi.spyOn(trainingApi, 'getById').mockResolvedValue(detailed())

    await useTrainingStore.getState().fetchList({ limit: 50 })

    expect(useTrainingStore.getState().items.some((item) => item.id === 'tr-1')).toBe(true)
    const local = localData.trainings.get('tr-1')
    expect(local?.exercises[0]?.sets).toHaveLength(1)
    expect(getTrainingSyncMeta(local?.metadata)?.status).toBe('synced')
    expect(isTrainingPendingSync(local!)).toBe(false)
  })

  it('refreshes an existing empty shell from cloud details', async () => {
    cloudSession()
    const shell = {
      ...listItem(),
      groups: [] as TrainingWithDetails['groups'],
      exercises: [] as TrainingWithDetails['exercises'],
    }
    localData.trainings.upsert({
      ...listItem(),
      metadata: {
        sync: {
          status: 'synced',
          serverSyncedAt: '2026-09-02T10:00:00.000Z',
          contentHash: trainingContentHash(shell),
        },
      },
    })
    vi.spyOn(trainingApi, 'list').mockResolvedValue({
      items: [listItem()],
      total: 1,
      page: 1,
      limit: 100,
    })
    vi.spyOn(trainingApi, 'getById').mockResolvedValue(detailed())

    await useTrainingStore.getState().fetchList({ limit: 50 })

    expect(localData.trainings.get('tr-1')?.exercises[0]?.sets).toHaveLength(1)
  })

  it('does not mark an empty header as pending when details fail to load', async () => {
    cloudSession()
    vi.spyOn(trainingApi, 'list').mockResolvedValue({
      items: [listItem()],
      total: 1,
      page: 1,
      limit: 100,
    })
    vi.spyOn(trainingApi, 'getById').mockRejectedValue(new Error('timeout'))

    await useTrainingStore.getState().fetchList({ limit: 50 })

    expect(useTrainingStore.getState().items.map((item) => item.id)).toContain('tr-1')
    const local = localData.trainings.get('tr-1')
    expect(local?.exercises).toEqual([])
    expect(getTrainingSyncMeta(local?.metadata)?.contentHash).toBeUndefined()
    expect(isTrainingPendingSync(local!)).toBe(false)
  })

  it('does not pull or replace a pending local training', async () => {
    cloudSession()
    localData.trainings.create({
      id: 'tr-1',
      templateId: null,
      status: 'in_progress',
      startedAt: '2026-09-02T10:00:00.000Z',
      metadata: { sync: { status: 'pending', reason: 'queued' } },
    })
    localData.trainings.addExercise('tr-1', {
      id: 'local-a',
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.addSet('local-a', {
      id: 'set-local',
      setNumber: 1,
      weight: 60,
      reps: 5,
      completed: true,
    })

    vi.spyOn(trainingApi, 'list').mockResolvedValue({
      items: [listItem({ status: 'in_progress', finishedAt: null })],
      total: 1,
      page: 1,
      limit: 100,
    })
    const getById = vi.spyOn(trainingApi, 'getById')

    await useTrainingStore.getState().fetchList()

    expect(getById).not.toHaveBeenCalled()
    expect(localData.trainings.get('tr-1')?.exercises[0]?.sets[0]?.id).toBe('set-local')
  })

  it('keeps older store rows when pulling the latest page', async () => {
    cloudSession()
    useTrainingStore.setState({
      items: [listItem({ id: 'old', startedAt: '2026-08-01T10:00:00.000Z' })],
    })
    vi.spyOn(trainingApi, 'list').mockResolvedValue({
      items: [listItem({ id: 'new', startedAt: '2026-09-02T10:00:00.000Z' })],
      total: 1,
      page: 1,
      limit: 50,
    })
    vi.spyOn(trainingApi, 'getById').mockResolvedValue(
      detailed({ id: 'new', startedAt: '2026-09-02T10:00:00.000Z', exercises: [] }),
    )

    await useTrainingStore.getState().pullLatestFromCloud()

    expect(useTrainingStore.getState().items.map((item) => item.id).sort()).toEqual([
      'new',
      'old',
    ])
  })
})

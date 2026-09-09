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
import type { TrainingWithDetails } from '@/entities/training/model/types'

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

function remoteTraining(overrides: Partial<TrainingWithDetails> = {}): TrainingWithDetails {
  return {
    id: 'tr-1',
    templateId: 'tpl-1',
    programId: null,
    programDayId: null,
    status: 'in_progress',
    scheduledAt: null,
    startedAt: '2026-09-02T10:00:00.000Z',
    finishedAt: null,
    notes: null,
    metadata: {},
    createdAt: '2026-09-02T10:00:00.000Z',
    groups: [],
    exercises: [],
    ...overrides,
  }
}

describe('cloud fetchOne', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEntityStores()
  })

  it('does not replace pending local sets with an empty remote snapshot', async () => {
    cloudSession()
    localData.trainings.create({
      id: 'tr-1',
      templateId: 'tpl-1',
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
      id: 'set-1',
      setNumber: 1,
      weight: 70,
      reps: 6,
      completed: true,
    })

    vi.spyOn(trainingApi, 'getById').mockResolvedValue(
      remoteTraining({
        exercises: [
          {
            id: 'remote-a',
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
            sets: [],
          },
        ],
      }),
    )

    await useTrainingStore.getState().fetchOne('tr-1')

    const current = useTrainingStore.getState().current
    expect(current?.exercises.map((item) => item.id)).toEqual(['local-a'])
    expect(current?.exercises[0].sets).toHaveLength(1)
    expect(current?.exercises[0].sets[0].id).toBe('set-1')
  })

  it('does not hydrate from a template when cloud fetch fails', async () => {
    cloudSession()
    localData.templates.create({ id: 'tpl-1', name: 'PPL' })
    localData.templates.addExercise('tpl-1', {
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.upsert({
      id: 'tr-1',
      templateId: 'tpl-1',
      programId: null,
      programDayId: null,
      status: 'in_progress',
      scheduledAt: null,
      startedAt: '2026-09-02T10:00:00.000Z',
      finishedAt: null,
      notes: null,
      metadata: { sync: { status: 'synced', serverSyncedAt: '2026-09-02T10:00:00.000Z' } },
      createdAt: '2026-09-02T10:00:00.000Z',
    })

    vi.spyOn(trainingApi, 'getById').mockRejectedValue(new Error('offline'))

    await useTrainingStore.getState().fetchOne('tr-1')

    const current = useTrainingStore.getState().current
    expect(current?.exercises).toEqual([])
    expect(getTrainingSyncMeta(current?.metadata)?.status).toBe('synced')
    expect(isTrainingPendingSync(current!)).toBe(false)
  })

  it('hydrates from a template after a confirmed 404', async () => {
    cloudSession()
    localData.templates.create({ id: 'tpl-1', name: 'PPL' })
    localData.templates.addExercise('tpl-1', {
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.upsert({
      id: 'tr-1',
      templateId: 'tpl-1',
      programId: null,
      programDayId: null,
      status: 'planned',
      scheduledAt: '2026-09-02T12:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      notes: null,
      metadata: { sync: { status: 'pending', reason: 'queued' } },
      createdAt: '2026-09-02T10:00:00.000Z',
    })

    vi.spyOn(trainingApi, 'getById').mockRejectedValue(new ApiError(404, 'missing'))

    await useTrainingStore.getState().fetchOne('tr-1')

    const current = useTrainingStore.getState().current
    expect(current?.exercises).toHaveLength(1)
    expect(current?.exercises[0]?.exerciseId).toBe('ex-a')
    expect(isTrainingPendingSync(current!)).toBe(true)
  })

  it('does not hydrate or queue push when start cannot pull an empty cloud shell', async () => {
    cloudSession()
    localData.templates.create({ id: 'tpl-1', name: 'PPL' })
    localData.templates.addExercise('tpl-1', {
      exerciseId: 'ex-a',
      exerciseOrder: 0,
      targetSets: 3,
    })
    localData.trainings.upsert({
      id: 'tr-1',
      templateId: 'tpl-1',
      programId: null,
      programDayId: null,
      status: 'planned',
      scheduledAt: '2026-09-02T12:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      notes: null,
      metadata: { sync: { status: 'synced', serverSyncedAt: '2026-09-02T10:00:00.000Z' } },
      createdAt: '2026-09-02T10:00:00.000Z',
    })

    vi.spyOn(trainingApi, 'getById').mockRejectedValue(new Error('offline'))

    const result = await useTrainingStore.getState().start('tr-1')

    expect(result.exercises).toEqual([])
    expect(result.status).toBe('planned')
    expect(isTrainingPendingSync(result)).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { trainingApi } from '@/entities/training/api/training-api'
import type { TrainingWithDetails } from '@/entities/training/model/types'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import { getTrainingSyncMeta } from '@/shared/lib/training-sync-meta'

import { syncTrainings } from './sync-trainings'

function emptyExercise(overrides: {
  id: string
  trainingId: string
  exerciseId: string
  exerciseOrder: number
}): TrainingWithDetails['exercises'][number] {
  return {
    id: overrides.id,
    trainingId: overrides.trainingId,
    exerciseId: overrides.exerciseId,
    exerciseOrder: overrides.exerciseOrder,
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
  }
}

function shell(training: {
  id: string
  templateId?: string | null
  status?: TrainingWithDetails['status']
  exercises?: TrainingWithDetails['exercises']
}): TrainingWithDetails {
  return {
    id: training.id,
    templateId: training.templateId ?? 'tpl-1',
    programId: null,
    programDayId: null,
    status: training.status ?? 'in_progress',
    scheduledAt: null,
    startedAt: '2026-09-02T10:00:00.000Z',
    finishedAt: null,
    notes: null,
    metadata: {},
    createdAt: '2026-09-02T10:00:00.000Z',
    groups: [],
    exercises: training.exercises ?? [],
  }
}

describe('syncTrainings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adopts remote exercise ids so sets upload onto existing rows', async () => {
    const training = localData.trainings.create({
      id: 'tr-1',
      templateId: null,
      status: 'in_progress',
      startedAt: '2026-09-02T10:00:00.000Z',
      metadata: { sync: { status: 'pending', reason: 'queued' } },
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
    localData.trainings.addSet('local-a', {
      id: 'set-1',
      setNumber: 1,
      weight: 80,
      reps: 8,
      completed: true,
    })

    const remote = shell({
      id: 'tr-1',
      templateId: null,
      exercises: [
        emptyExercise({
          id: 'remote-a',
          trainingId: 'tr-1',
          exerciseId: 'ex-a',
          exerciseOrder: 0,
        }),
        emptyExercise({
          id: 'remote-b',
          trainingId: 'tr-1',
          exerciseId: 'ex-b',
          exerciseOrder: 1,
        }),
      ],
    })

    vi.spyOn(trainingApi, 'getById').mockResolvedValue(remote)
    vi.spyOn(trainingApi, 'update').mockResolvedValue(remote)
    const addExercise = vi.spyOn(trainingApi, 'addExercise').mockImplementation(async (_id, input) =>
      emptyExercise({
        id: String(input.id),
        trainingId: 'tr-1',
        exerciseId: input.exerciseId,
        exerciseOrder: input.exerciseOrder,
      }),
    )
    vi.spyOn(trainingApi, 'updateExercise').mockResolvedValue(
      emptyExercise({
        id: 'remote-a',
        trainingId: 'tr-1',
        exerciseId: 'ex-a',
        exerciseOrder: 0,
      }),
    )
    vi.spyOn(trainingApi, 'addSet').mockResolvedValue({
      id: 'set-1',
      trainingExerciseId: 'remote-a',
      setNumber: 1,
      weight: 80,
      reps: 8,
      rir: null,
      rpe: null,
      completed: true,
      isWarmup: false,
      metadata: {},
      createdAt: '2026-09-02T10:00:00.000Z',
    })
    vi.spyOn(trainingApi, 'updateSet').mockResolvedValue({
      id: 'set-1',
      trainingExerciseId: 'remote-a',
      setNumber: 1,
      weight: 80,
      reps: 8,
      rir: null,
      rpe: null,
      completed: true,
      isWarmup: false,
      metadata: {},
      createdAt: '2026-09-02T10:00:00.000Z',
    })
    const create = vi.spyOn(trainingApi, 'create')

    const progress = await syncTrainings(['tr-1'], undefined, { skipCatalogFlush: true })

    expect(progress[0].status).toBe('done')
    expect(create).not.toHaveBeenCalled()
    expect(addExercise.mock.calls.map((call) => call[1].id)).toEqual(['remote-a', 'remote-b'])
    expect(addExercise.mock.calls.map((call) => call[1].id)).not.toContain('local-a')
    expect(localData.trainings.get('tr-1')?.exercises.map((item) => item.id)).toEqual([
      'remote-a',
      'remote-b',
    ])
    expect(localData.trainings.get('tr-1')?.exercises[0].sets[0].trainingExerciseId).toBe('remote-a')
  })

  it('does not mark a template training without exercises as synced', async () => {
    localData.templates.create({ id: 'tpl-1', name: 'PPL' })
    localData.trainings.create(
      {
        id: 'tr-empty',
        templateId: 'tpl-1',
        status: 'in_progress',
        startedAt: '2026-09-02T10:00:00.000Z',
        metadata: { sync: { status: 'pending', reason: 'queued' } },
      },
      { skipTemplateCopy: true },
    )

    const getById = vi.spyOn(trainingApi, 'getById').mockRejectedValue(new ApiError(404, 'missing'))
    const create = vi.spyOn(trainingApi, 'create')

    const progress = await syncTrainings(['tr-empty'], undefined, { skipCatalogFlush: true })

    expect(progress[0].status).toBe('pending')
    expect(getById).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
    expect(getTrainingSyncMeta(localData.trainings.get('tr-empty')?.metadata)?.status).toBe(
      'pending',
    )
  })
})

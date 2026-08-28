import type { TrainingWithDetails } from '@/entities/training/model/types'
import {
  getTrainingSyncMeta,
  syncReasonLabel,
  trainingContentHash,
} from './training-sync-meta'

function makeTraining(overrides: Partial<TrainingWithDetails> = {}): TrainingWithDetails {
  return {
    id: 'training-1',
    templateId: null,
    programId: null,
    programDayId: null,
    status: 'planned',
    scheduledAt: '2026-08-28T10:00:00.000Z',
    startedAt: null,
    finishedAt: null,
    notes: null,
    metadata: {},
    createdAt: '2026-08-28T09:00:00.000Z',
    groups: [],
    exercises: [
      {
        id: 'tex-1',
        trainingId: 'training-1',
        exerciseId: 'ex-1',
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
            trainingExerciseId: 'tex-1',
            setNumber: 1,
            weight: 100,
            reps: 8,
            rir: null,
            rpe: null,
            completed: true,
            isWarmup: false,
            metadata: {},
            createdAt: '2026-08-28T10:00:00.000Z',
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('training-sync-meta', () => {
  describe('getTrainingSyncMeta', () => {
    it('returns null when sync metadata is missing or invalid', () => {
      expect(getTrainingSyncMeta(undefined)).toBeNull()
      expect(getTrainingSyncMeta({ sync: 'bad' })).toBeNull()
      expect(getTrainingSyncMeta({ sync: { status: 'unknown' } })).toBeNull()
    })

    it('parses valid sync metadata', () => {
      expect(getTrainingSyncMeta({ sync: { status: 'pending', reason: 'network' } })).toEqual({
        status: 'pending',
        reason: 'network',
      })
    })
  })

  describe('trainingContentHash', () => {
    it('is stable for identical training content', () => {
      const training = makeTraining()
      expect(trainingContentHash(training)).toBe(trainingContentHash(structuredClone(training)))
    })

    it('changes when uploadable content changes', () => {
      const before = makeTraining()
      const after = makeTraining({
        exercises: [
          {
            ...makeTraining().exercises[0],
            sets: [
              {
                ...makeTraining().exercises[0].sets[0],
                weight: 105,
              },
            ],
          },
        ],
      })

      expect(trainingContentHash(before)).not.toBe(trainingContentHash(after))
    })

    it('ignores sync metadata in the hash input', () => {
      const base = makeTraining()
      const withSync = makeTraining({
        metadata: { sync: { status: 'pending', reason: 'network' } },
      })

      expect(trainingContentHash(base)).toBe(trainingContentHash(withSync))
    })
  })

  describe('syncReasonLabel', () => {
    it('maps known reasons to Russian labels', () => {
      expect(syncReasonLabel('network')).toBe('нет сети')
      expect(syncReasonLabel('queued')).toBe('ожидает отправки')
      expect(syncReasonLabel(undefined)).toBe('не на сервере')
    })
  })
})

import {
  formatKg,
  lastWorkingSetWeight,
  trainingOccurredAt,
  workingSetMaxWeight,
} from './session-weight'

describe('session-weight', () => {
  describe('workingSetMaxWeight', () => {
    it('ignores warmups and incomplete sets', () => {
      const max = workingSetMaxWeight([
        { completed: true, isWarmup: true, weight: 50 },
        { completed: false, weight: 120 },
        { completed: true, isWarmup: false, weight: 100 },
        { completed: true, isWarmup: false, weight: 105 },
      ])
      expect(max).toBe(105)
    })

    it('returns null for warmup exercises', () => {
      expect(
        workingSetMaxWeight([{ completed: true, weight: 100 }], true),
      ).toBeNull()
    })
  })

  describe('lastWorkingSetWeight', () => {
    it('returns the last working set by setNumber', () => {
      expect(
        lastWorkingSetWeight([
          { setNumber: 1, weight: 80, isWarmup: false },
          { setNumber: 2, weight: 90, isWarmup: true },
          { setNumber: 3, weight: 100, isWarmup: false },
        ]),
      ).toBe(100)
    })
  })

  describe('trainingOccurredAt', () => {
    it('prefers finishedAt, then startedAt, then scheduledAt, then createdAt', () => {
      expect(
        trainingOccurredAt({
          finishedAt: '2026-08-28T12:00:00.000Z',
          startedAt: '2026-08-28T11:00:00.000Z',
          scheduledAt: '2026-08-28T10:00:00.000Z',
          createdAt: '2026-08-28T09:00:00.000Z',
        }),
      ).toBe('2026-08-28T12:00:00.000Z')

      expect(
        trainingOccurredAt({
          finishedAt: null,
          startedAt: '2026-08-28T11:00:00.000Z',
          scheduledAt: '2026-08-28T10:00:00.000Z',
          createdAt: '2026-08-28T09:00:00.000Z',
        }),
      ).toBe('2026-08-28T11:00:00.000Z')
    })
  })

  describe('formatKg', () => {
    it('formats integers without decimals', () => {
      expect(formatKg(100)).toBe('100')
    })

    it('formats fractional values with one decimal', () => {
      expect(formatKg(62.5)).toBe('62.5')
    })
  })
})

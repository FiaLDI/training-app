import { templateIdsForWeek } from './snapshot-week-days'

describe('templateIdsForWeek', () => {
  const weekStart = '2026-09-14'

  it('maps active sessions onto weekday slots', () => {
    const ids = templateIdsForWeek(weekStart, [
      { status: 'planned', templateId: 'push', scheduledAt: '2026-09-14T12:00:00.000Z' },
      { status: 'finished', templateId: 'pull', scheduledAt: '2026-09-16T12:00:00.000Z' },
      { status: 'cancelled', templateId: 'legs', scheduledAt: '2026-09-18T12:00:00.000Z' },
    ])

    expect(ids.get(1)).toBe('push')
    expect(ids.get(3)).toBe('pull')
    expect(ids.has(5)).toBe(false)
  })

  it('prefers an in-progress session over a finished one on the same day', () => {
    const ids = templateIdsForWeek(weekStart, [
      { status: 'finished', templateId: 'old', scheduledAt: '2026-09-15T12:00:00.000Z' },
      { status: 'in_progress', templateId: 'new', scheduledAt: '2026-09-15T12:00:00.000Z' },
    ])

    expect(ids.get(2)).toBe('new')
  })

  it('ignores sessions outside the week', () => {
    const ids = templateIdsForWeek(weekStart, [
      { status: 'planned', templateId: 'prev', scheduledAt: '2026-09-13T12:00:00.000Z' },
      { status: 'planned', templateId: 'next', scheduledAt: '2026-09-21T12:00:00.000Z' },
    ])

    expect(ids.size).toBe(0)
  })
})

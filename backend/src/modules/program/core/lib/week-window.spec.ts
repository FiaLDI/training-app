import { isApplyWeekAllowed, scheduledAtForDay } from './week-window'

describe('week-window', () => {
  it('allows the Monday that contains today', () => {
    expect(isApplyWeekAllowed('2026-09-14', new Date('2026-09-16T10:00:00.000Z'))).toBe(true)
  })

  it('rejects a fully past week', () => {
    expect(isApplyWeekAllowed('2026-08-31', new Date('2026-09-14T10:00:00.000Z'))).toBe(false)
  })

  it('rejects a future week', () => {
    expect(isApplyWeekAllowed('2026-09-21', new Date('2026-09-14T10:00:00.000Z'))).toBe(false)
  })

  it('builds noon UTC for a weekday', () => {
    expect(scheduledAtForDay('2026-09-14', 3)).toBe('2026-09-16T12:00:00.000Z')
  })
})

import { currentMondayKey, dayOfWeekFromDateKey, isApplyWeekAllowed, scheduledAtForDay } from './week-window'

describe('week-window', () => {
  it('returns the UTC Monday of the current week', () => {
    expect(currentMondayKey(new Date('2026-09-16T18:29:00.000Z'))).toBe('2026-09-14')
    expect(currentMondayKey(new Date('2026-09-14T00:00:00.000Z'))).toBe('2026-09-14')
    expect(currentMondayKey(new Date('2026-09-20T23:00:00.000Z'))).toBe('2026-09-14')
  })

  it('maps a date key to Monday=1 Sunday=7', () => {
    expect(dayOfWeekFromDateKey('2026-09-14')).toBe(1)
    expect(dayOfWeekFromDateKey('2026-09-16')).toBe(3)
    expect(dayOfWeekFromDateKey('2026-09-20')).toBe(7)
    expect(dayOfWeekFromDateKey('nope')).toBeNull()
  })

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

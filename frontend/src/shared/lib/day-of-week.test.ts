import { dayOfWeekLabel } from './day-of-week'

describe('dayOfWeekLabel', () => {
  it('maps ISO weekday 1 to Monday', () => {
    expect(dayOfWeekLabel(1)).toBe('Понедельник')
    expect(dayOfWeekLabel(7)).toBe('Воскресенье')
  })
})

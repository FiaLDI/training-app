import { extraDefaultProgramIds } from './prune-default-programs'

describe('extraDefaultProgramIds', () => {
  it('keeps a single default program', () => {
    expect(
      extraDefaultProgramIds([
        { id: 'a', name: 'Моя неделя', createdAt: '2026-01-01T00:00:00.000Z', dayCount: 0 },
      ]),
    ).toEqual([])
  })

  it('keeps the newest default that has days and drops empty copies', () => {
    expect(
      extraDefaultProgramIds([
        { id: 'new-empty', name: 'Моя неделя', createdAt: '2026-03-01T00:00:00.000Z', dayCount: 0 },
        { id: 'used', name: 'Моя неделя', createdAt: '2026-02-01T00:00:00.000Z', dayCount: 3 },
        { id: 'old-empty', name: 'Моя неделя', createdAt: '2026-01-01T00:00:00.000Z', dayCount: 0 },
        { id: 'ss', name: 'Starting Strength', createdAt: '2026-04-01T00:00:00.000Z', dayCount: 3 },
      ]),
    ).toEqual(['new-empty', 'old-empty'])
  })

  it('keeps the oldest copy when none have days', () => {
    expect(
      extraDefaultProgramIds([
        { id: 'c', name: 'Моя неделя', createdAt: '2026-03-01T00:00:00.000Z', dayCount: 0 },
        { id: 'b', name: 'Моя неделя', createdAt: '2026-02-01T00:00:00.000Z', dayCount: 0 },
        { id: 'a', name: 'Моя неделя', createdAt: '2026-01-01T00:00:00.000Z', dayCount: 0 },
      ]),
    ).toEqual(['c', 'b'])
  })
})

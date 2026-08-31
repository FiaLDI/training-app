import { resolveRestSeconds } from './resolve-rest-seconds'

describe('resolveRestSeconds', () => {
  it('uses exercise rest when positive', () => {
    expect(resolveRestSeconds({ restSeconds: 120 }, 90)).toBe(120)
  })

  it('falls back to default when rest is null, zero, or negative', () => {
    expect(resolveRestSeconds({ restSeconds: null }, 90)).toBe(90)
    expect(resolveRestSeconds({ restSeconds: 0 }, 90)).toBe(90)
  })

  it('prefers group rest after a superset or circuit', () => {
    expect(resolveRestSeconds({ restSeconds: 45 }, 90, 120)).toBe(120)
    expect(resolveRestSeconds({ restSeconds: 45 }, 90, null)).toBe(45)
    expect(resolveRestSeconds({ restSeconds: null }, 90, 0)).toBe(90)
  })
})

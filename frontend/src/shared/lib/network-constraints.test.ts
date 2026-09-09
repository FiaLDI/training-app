import { isConstrainedConnection } from './network-constraints'

describe('isConstrainedConnection', () => {
  it('is true for save-data and 2g', () => {
    expect(isConstrainedConnection({ saveData: true, effectiveType: '4g' })).toBe(true)
    expect(isConstrainedConnection({ effectiveType: '2g' })).toBe(true)
    expect(isConstrainedConnection({ effectiveType: 'slow-2g' })).toBe(true)
  })

  it('is false on a normal connection', () => {
    expect(isConstrainedConnection(undefined)).toBe(false)
    expect(isConstrainedConnection({ effectiveType: '4g' })).toBe(false)
    expect(isConstrainedConnection({ saveData: false, effectiveType: '3g' })).toBe(
      false,
    )
  })
})

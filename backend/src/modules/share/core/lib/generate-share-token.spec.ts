import { generateShareToken } from './generate-share-token'

describe('generateShareToken', () => {
  it('returns a unique url-safe token', () => {
    const a = generateShareToken()
    const b = generateShareToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(a.length).toBeGreaterThanOrEqual(16)
    expect(a).not.toBe(b)
  })
})

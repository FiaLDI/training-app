import { generateAuthCode } from './generate-auth-code'

describe('generateAuthCode', () => {
  it('generates a code of the requested length', () => {
    expect(generateAuthCode()).toHaveLength(12)
    expect(generateAuthCode(8)).toHaveLength(8)
    expect(generateAuthCode(16)).toHaveLength(16)
  })

  it('uses only characters from the auth alphabet', () => {
    const alphabet = /^[0-9A-Za-z!@#$%&*]+$/
    for (let i = 0; i < 20; i += 1) {
      expect(generateAuthCode()).toMatch(alphabet)
    }
  })

  it('produces different codes across calls', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateAuthCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

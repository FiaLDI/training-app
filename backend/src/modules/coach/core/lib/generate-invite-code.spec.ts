import { generateInviteCode, normalizeInviteCode } from './generate-invite-code'

describe('invite codes', () => {
  it('generates uppercase unambiguous codes', () => {
    const code = generateInviteCode()
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })

  it('normalizes pasted codes', () => {
    expect(normalizeInviteCode(' ab cd-12 ')).toBe('ABCD-12')
    expect(normalizeInviteCode('abc8xyz2')).toBe('ABC8XYZ2')
  })
})

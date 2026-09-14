import { publicSharePath, publicShareUrl } from './share-url'

describe('share url', () => {
  it('encodes the token in the path', () => {
    expect(publicSharePath('ab/c')).toBe('/share/ab%2Fc')
  })

  it('prefixes origin in the browser', () => {
    expect(publicShareUrl('token')).toMatch(/\/share\/token$/)
  })
})

import {
  buildDropSetMetadata,
  getDropGroupId,
  getDropIndex,
  isDropSet,
  suggestDropWeight,
} from './drop-set'

describe('drop-set', () => {
  it('detects and reads drop metadata', () => {
    const metadata = buildDropSetMetadata('drop-1', 2)
    expect(isDropSet(metadata)).toBe(true)
    expect(getDropGroupId(metadata)).toBe('drop-1')
    expect(getDropIndex(metadata)).toBe(2)
  })

  it('suggests reduced weight for drop sets', () => {
    expect(suggestDropWeight(100, 10)).toBe('90')
    expect(suggestDropWeight(null, 10)).toBe('')
    expect(suggestDropWeight(5, 10)).toBe('0')
  })
})

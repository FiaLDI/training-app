import { areExerciseOrdersContiguous, groupTypeFromMemberCount } from './exercise-group'

describe('exercise-group', () => {
  describe('groupTypeFromMemberCount', () => {
    it('returns superset for 2 members', () => {
      expect(groupTypeFromMemberCount(2)).toBe('superset')
    })

    it('returns triset for 3 members', () => {
      expect(groupTypeFromMemberCount(3)).toBe('triset')
    })

    it('returns circuit for 4+ members', () => {
      expect(groupTypeFromMemberCount(4)).toBe('circuit')
      expect(groupTypeFromMemberCount(10)).toBe('circuit')
    })
  })

  describe('areExerciseOrdersContiguous', () => {
    it('requires at least two orders', () => {
      expect(areExerciseOrdersContiguous([])).toBe(false)
      expect(areExerciseOrdersContiguous([1])).toBe(false)
    })

    it('accepts adjacent orders regardless of input order', () => {
      expect(areExerciseOrdersContiguous([3, 1, 2])).toBe(true)
      expect(areExerciseOrdersContiguous([5, 6])).toBe(true)
    })

    it('rejects gaps', () => {
      expect(areExerciseOrdersContiguous([1, 3])).toBe(false)
      expect(areExerciseOrdersContiguous([2, 4, 5])).toBe(false)
    })
  })
})

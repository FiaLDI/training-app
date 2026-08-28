import {
  areExerciseOrdersContiguous,
  groupTypeFromMemberCount,
  resolveLinkWithBelowAction,
} from './exercise-group-utils'

describe('exercise-group-utils', () => {
  describe('groupTypeFromMemberCount', () => {
    it('derives superset, triset, and circuit types', () => {
      expect(groupTypeFromMemberCount(2)).toBe('superset')
      expect(groupTypeFromMemberCount(3)).toBe('triset')
      expect(groupTypeFromMemberCount(5)).toBe('circuit')
    })
  })

  describe('areExerciseOrdersContiguous', () => {
    it('validates contiguous exercise orders', () => {
      expect(areExerciseOrdersContiguous([4, 5, 6])).toBe(true)
      expect(areExerciseOrdersContiguous([1, 3])).toBe(false)
    })
  })

  describe('resolveLinkWithBelowAction', () => {
    const exercises = [
      { id: 'a', exerciseOrder: 0, groupId: null, positionInGroup: null },
      { id: 'b', exerciseOrder: 1, groupId: null, positionInGroup: null },
      { id: 'c', exerciseOrder: 2, groupId: 'g1', positionInGroup: 0 },
      { id: 'd', exerciseOrder: 3, groupId: 'g1', positionInGroup: 1 },
      { id: 'e', exerciseOrder: 4, groupId: null, positionInGroup: null },
    ]

    it('suggests creating a group for two adjacent ungrouped exercises', () => {
      expect(resolveLinkWithBelowAction(exercises[0], exercises[1], exercises)).toEqual({
        kind: 'create',
        exerciseIds: ['a', 'b'],
      })
    })

    it('suggests adding to a group when below is free and current is last in group', () => {
      expect(resolveLinkWithBelowAction(exercises[3], exercises[4], exercises)).toEqual({
        kind: 'add-to-group',
        groupId: 'g1',
        exerciseId: 'e',
      })
    })

    it('returns null when exercises are not adjacent', () => {
      expect(resolveLinkWithBelowAction(exercises[0], exercises[2], exercises)).toBeNull()
    })
  })
})

import {
  buildTrainingSessionItems,
  countCompletedGroupRounds,
  isGroupRoundComplete,
} from './build-session-items'

describe('build-session-items', () => {
  const group = { id: 'g1', groupOrder: 1, type: 'superset' as const, restSeconds: 90 }

  const exercises = [
    {
      id: 'standalone',
      exerciseOrder: 0,
      groupId: null,
      positionInGroup: null,
      targetSets: 3,
      sets: [],
    },
    {
      id: 'sup-a',
      exerciseOrder: 1,
      groupId: 'g1',
      positionInGroup: 0,
      targetSets: 3,
      sets: [{ completed: true, isWarmup: false }],
    },
    {
      id: 'sup-b',
      exerciseOrder: 2,
      groupId: 'g1',
      positionInGroup: 1,
      targetSets: 3,
      sets: [{ completed: true, isWarmup: false }],
    },
    {
      id: 'tail',
      exerciseOrder: 3,
      groupId: null,
      positionInGroup: null,
      targetSets: 3,
      sets: [],
    },
  ]

  it('orders standalone exercises and grouped blocks by groupOrder / exerciseOrder', () => {
    const items = buildTrainingSessionItems(exercises, [group])

    expect(items.map((item) => item.kind)).toEqual(['standalone', 'group', 'standalone'])
    expect(items[1]).toMatchObject({
      kind: 'group',
      group,
      exercises: [exercises[1], exercises[2]],
    })
  })

  it('tracks completed group rounds across members', () => {
    expect(countCompletedGroupRounds('g1', exercises)).toBe(1)
    expect(isGroupRoundComplete('g1', exercises)).toBe(false)

    const completed = exercises.map((item) =>
      item.groupId === 'g1'
        ? {
            ...item,
            sets: [
              { completed: true, isWarmup: false },
              { completed: true, isWarmup: false },
              { completed: true, isWarmup: false },
            ],
          }
        : item,
    )

    expect(isGroupRoundComplete('g1', completed)).toBe(true)
  })
})

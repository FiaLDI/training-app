import { aggregateMuscleGroupRows, parseMuscleGroups } from './muscle-groups'

describe('parseMuscleGroups', () => {
  it('expands legacy labels', () => {
    expect(parseMuscleGroups('руки')).toEqual(['бицепс', 'трицепс', 'предплечья'])
  })

  it('parses comma-separated groups', () => {
    expect(parseMuscleGroups('грудь, трицепс')).toEqual(['грудь', 'трицепс'])
  })
})

describe('aggregateMuscleGroupRows', () => {
  it('splits volume evenly across muscle groups', () => {
    const result = aggregateMuscleGroupRows([
      { muscleGroupRaw: 'грудь, трицепс', volume: 1000, sets: 4 },
    ])
    expect(result).toEqual([
      { muscleGroup: 'грудь', volume: 500, sets: 2 },
      { muscleGroup: 'трицепс', volume: 500, sets: 2 },
    ])
  })

  it('uses "другое" when muscle group is empty', () => {
    const result = aggregateMuscleGroupRows([{ muscleGroupRaw: '', volume: 200, sets: 2 }])
    expect(result).toEqual([{ muscleGroup: 'другое', volume: 200, sets: 2 }])
  })
})

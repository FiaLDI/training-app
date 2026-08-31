import {
  aggregateMuscleGroupRows,
  PRIMARY_MUSCLE_WEIGHT,
  parseMuscleGroups,
  SECONDARY_MUSCLE_WEIGHT,
} from './muscle-groups'

describe('parseMuscleGroups', () => {
  it('expands legacy labels', () => {
    expect(parseMuscleGroups('руки')).toEqual(['бицепс', 'трицепс', 'предплечья'])
  })

  it('parses comma-separated groups and keeps order (first = primary)', () => {
    expect(parseMuscleGroups('грудь, трицепс')).toEqual(['грудь', 'трицепс'])
    expect(parseMuscleGroups('трицепс,грудь')).toEqual(['трицепс', 'грудь'])
  })
})

describe('aggregateMuscleGroupRows', () => {
  it('attributes full volume to a single muscle group', () => {
    const result = aggregateMuscleGroupRows([
      { muscleGroupRaw: 'грудь', volume: 1000, sets: 4 },
    ])
    expect(result).toEqual([{ muscleGroup: 'грудь', volume: 1000, sets: 4 }])
  })

  it('gives primary weight 1 and additional 0.6', () => {
    const result = aggregateMuscleGroupRows([
      { muscleGroupRaw: 'грудь, трицепс', volume: 1000, sets: 4 },
    ])
    expect(result).toEqual([
      { muscleGroup: 'грудь', volume: 1000 * PRIMARY_MUSCLE_WEIGHT, sets: 4 },
      {
        muscleGroup: 'трицепс',
        volume: Math.round(1000 * SECONDARY_MUSCLE_WEIGHT),
        sets: Math.round(4 * SECONDARY_MUSCLE_WEIGHT * 10) / 10,
      },
    ])
  })

  it('treats the first listed group as primary after migration', () => {
    const result = aggregateMuscleGroupRows([
      { muscleGroupRaw: 'трицепс, грудь', volume: 1000, sets: 4 },
    ])
    expect(result[0]).toMatchObject({ muscleGroup: 'трицепс', volume: 1000 })
    expect(result[1]).toMatchObject({
      muscleGroup: 'грудь',
      volume: Math.round(1000 * SECONDARY_MUSCLE_WEIGHT),
    })
  })

  it('uses "другое" when muscle group is empty', () => {
    const result = aggregateMuscleGroupRows([{ muscleGroupRaw: '', volume: 200, sets: 2 }])
    expect(result).toEqual([{ muscleGroup: 'другое', volume: 200, sets: 2 }])
  })
})

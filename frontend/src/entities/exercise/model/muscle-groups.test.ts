import {
  aggregateMuscleGroupRows,
  muscleGroupIntensities,
  parseMuscleGroups,
  PRIMARY_MUSCLE_WEIGHT,
  SECONDARY_MUSCLE_WEIGHT,
  serializeMuscleGroups,
  togglePrimaryMuscleGroup,
  toggleSecondaryMuscleGroup,
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

describe('serializeMuscleGroups', () => {
  it('keeps primary first', () => {
    expect(serializeMuscleGroups(['грудь', 'трицепс'])).toBe('грудь,трицепс')
    expect(serializeMuscleGroups(['трицепс', 'грудь'])).toBe('трицепс,грудь')
  })
})

describe('togglePrimaryMuscleGroup', () => {
  it('sets the first group as primary and demotes the previous one', () => {
    expect(togglePrimaryMuscleGroup(['грудь', 'трицепс'], 'трицепс')).toEqual([
      'трицепс',
      'грудь',
    ])
  })

  it('deselects primary and promotes the next additional group', () => {
    expect(togglePrimaryMuscleGroup(['грудь', 'трицепс'], 'грудь')).toEqual(['трицепс'])
  })
})

describe('toggleSecondaryMuscleGroup', () => {
  it('adds and removes additional groups', () => {
    expect(toggleSecondaryMuscleGroup(['грудь'], 'трицепс')).toEqual(['грудь', 'трицепс'])
    expect(toggleSecondaryMuscleGroup(['грудь', 'трицепс'], 'трицепс')).toEqual(['грудь'])
  })

  it('becomes primary when nothing is selected yet', () => {
    expect(toggleSecondaryMuscleGroup([], 'грудь')).toEqual(['грудь'])
  })
})

describe('muscleGroupIntensities', () => {
  it('maps primary to 1 and additional to 0.6', () => {
    expect(muscleGroupIntensities(['грудь', 'трицепс', 'передние дельты'])).toEqual({
      грудь: PRIMARY_MUSCLE_WEIGHT,
      трицепс: SECONDARY_MUSCLE_WEIGHT,
      'передние дельты': SECONDARY_MUSCLE_WEIGHT,
    })
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
      { muscleGroup: 'грудь', volume: 1000, sets: 4 },
      { muscleGroup: 'трицепс', volume: 600, sets: 2.4 },
    ])
  })

  it('uses "другое" when muscle group is empty', () => {
    const result = aggregateMuscleGroupRows([{ muscleGroupRaw: '', volume: 200, sets: 2 }])
    expect(result).toEqual([{ muscleGroup: 'другое', volume: 200, sets: 2 }])
  })
})

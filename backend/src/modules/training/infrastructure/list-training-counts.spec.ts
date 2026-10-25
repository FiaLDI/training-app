import { countsByTrainingId } from './list-training-counts'

describe('countsByTrainingId', () => {
  it('maps GROUP BY rows to per-training set and exercise counts', () => {
    const map = countsByTrainingId([
      { trainingId: 't-1', setCount: '4', exerciseCount: '2' },
      { trainingId: 't-2', setCount: 0, exerciseCount: 1 },
    ])

    expect(map.get('t-1')).toEqual({ setCount: 4, exerciseCount: 2 })
    expect(map.get('t-2')).toEqual({ setCount: 0, exerciseCount: 1 })
  })

  it('treats missing numeric values as zero', () => {
    const map = countsByTrainingId([{ trainingId: 't-1', setCount: '', exerciseCount: 'x' }])
    expect(map.get('t-1')).toEqual({ setCount: 0, exerciseCount: 0 })
  })
})

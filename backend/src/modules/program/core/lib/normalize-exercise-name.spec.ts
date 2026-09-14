import { normalizeExerciseName } from './normalize-exercise-name'

describe('normalizeExerciseName', () => {
  it('collapses case, yo and whitespace', () => {
    expect(normalizeExerciseName('  Жим лёжа  с гантелями ')).toBe('жим лежа с гантелями')
  })
})

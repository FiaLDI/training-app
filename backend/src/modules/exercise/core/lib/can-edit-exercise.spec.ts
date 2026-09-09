import { canEditExercise } from './can-edit-exercise'

const admin = { id: 'admin-1', role: 'admin' as const }
const owner = { id: 'user-1', role: 'user' as const }
const other = { id: 'user-2', role: 'user' as const }

describe('canEditExercise', () => {
  it('allows only admin to edit system exercises', () => {
    const exercise = { isSystem: true, userId: null }
    expect(canEditExercise(exercise, admin)).toBe(true)
    expect(canEditExercise(exercise, owner)).toBe(false)
  })

  it('allows only the owner to edit custom exercises', () => {
    const exercise = { isSystem: false, userId: owner.id }
    expect(canEditExercise(exercise, owner)).toBe(true)
    expect(canEditExercise(exercise, other)).toBe(false)
    expect(canEditExercise(exercise, admin)).toBe(false)
  })
})

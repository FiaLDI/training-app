import { UserRole } from '../../../auth/core/types'
import { Exercise } from '../types'

/** System exercises: admin only. Custom: owner only. */
export function canEditExercise(
  exercise: Pick<Exercise, 'userId'>,
  user: { id: string; role: UserRole },
): boolean {
  if (exercise.userId === null) {
    return user.role === 'admin'
  }
  return exercise.userId === user.id
}

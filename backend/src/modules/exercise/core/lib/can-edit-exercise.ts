import { UserRole } from '../../../auth/core/types'
import { Exercise } from '../types'

/** System exercises: admin only. Custom: owner only. */
export function canEditExercise(
  exercise: Pick<Exercise, 'isSystem' | 'userId'>,
  user: { id: string; role: UserRole },
): boolean {
  if (exercise.isSystem) {
    return user.role === 'admin'
  }
  return exercise.userId === user.id
}

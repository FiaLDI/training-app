import type { AuthUser } from '@/entities/session/api/auth-api'
import { isAdmin } from '@/entities/session/model/is-admin'

import type { Exercise } from './types'

/** System (no userId): admin only. Custom: owner only. */
export function canEditExercise(
  exercise: Pick<Exercise, 'userId'>,
  user: AuthUser | null | undefined,
): boolean {
  if (!user) return false
  if (exercise.userId == null) {
    return isAdmin(user)
  }
  return exercise.userId === user.id
}

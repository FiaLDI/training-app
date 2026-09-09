import type { AuthUser } from '@/entities/session/api/auth-api'
import { isAdmin } from '@/entities/session/model/is-admin'

import { hydrateExercise } from './hydrate-exercise'
import type { Exercise } from './types'

/** System: admin only. Custom: owner only. */
export function canEditExercise(
  exercise: Pick<Exercise, 'isSystem' | 'userId' | 'metadata'>,
  user: AuthUser | null | undefined,
): boolean {
  if (!user) return false
  const hydrated = hydrateExercise(exercise as Exercise)
  if (hydrated.isSystem) {
    return isAdmin(user)
  }
  return exercise.userId === user.id
}

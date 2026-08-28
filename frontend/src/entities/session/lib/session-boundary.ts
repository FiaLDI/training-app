import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import {
  applyStorageScopeFromSession,
  setStorageScope,
  type StorageScope,
} from '@/shared/lib/storage-scope'

export function resetClientStateOnSessionBoundary(): void {
  resetEntityStores()
}

export function enterSessionScope(mode: 'local' | 'cloud', userId?: string): void {
  resetClientStateOnSessionBoundary()
  if (mode === 'local') {
    setStorageScope('local')
  } else if (userId) {
    setStorageScope(`cloud:${userId}`)
  }
}

export function syncStorageScopeFromSession(
  mode: 'local' | 'cloud' | null,
  userId: string | null,
): StorageScope | null {
  if (mode === 'local') {
    setStorageScope('local')
    return 'local'
  }
  if (mode === 'cloud' && userId) {
    const scope: StorageScope = `cloud:${userId}`
    setStorageScope(scope)
    return scope
  }
  applyStorageScopeFromSession(mode, userId)
  return null
}

export function leaveSession(): void {
  resetClientStateOnSessionBoundary()
}

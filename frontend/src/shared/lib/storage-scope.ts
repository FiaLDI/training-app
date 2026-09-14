export type StorageScope = 'local' | `cloud:${string}`

type SessionMode = 'local' | 'cloud'

const LEGACY_PREFIX = 'ironlog:local:'
const SCOPE_PREFIX = 'ironlog:scope:'
const ACTIVE_SCOPE_KEY = 'ironlog:active-scope'

/** Entity collections persisted as IndexedDB records (formerly localStorage arrays). */
export const COLLECTION_SUFFIXES = [
  'exercises',
  'sources',
  'timecodes',
  'templates',
  'template-exercises',
  'template-groups',
  'programs',
  'program-days',
  'trainings',
  'training-exercises',
  'training-groups',
  'training-sets',
  'body-measurements',
  'feedbacks',
] as const

/** Aux key-value blobs (outboxes, one-shot flags). */
export const KV_SUFFIXES = [
  'catalog-outbox',
  'entity-delete-outbox',
  'sync-heal-content-hash-v1',
] as const

/** Suffixes for all user-scoped collections and sync aux keys. */
export const SCOPED_DATA_SUFFIXES = [...COLLECTION_SUFFIXES, ...KV_SUFFIXES] as const

export type CollectionSuffix = (typeof COLLECTION_SUFFIXES)[number]
export type KvSuffix = (typeof KV_SUFFIXES)[number]

function isStorageScope(value: string): value is StorageScope {
  return value === 'local' || /^cloud:[^:]+/.test(value)
}

function readPersistedScope(): StorageScope {
  if (typeof window === 'undefined') return 'local'
  try {
    const raw = localStorage.getItem(ACTIVE_SCOPE_KEY)?.trim()
    if (raw && isStorageScope(raw)) return raw
  } catch {
    // ignore quota / privacy errors
  }
  return 'local'
}

function persistActiveScope(scope: StorageScope): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ACTIVE_SCOPE_KEY, scope)
  } catch {
    // ignore quota / privacy errors
  }
}

let currentScope: StorageScope = readPersistedScope()

export function getStorageScope(): StorageScope {
  return currentScope
}

/** Re-read the last active scope from localStorage (simulates a reload). */
export function restorePersistedStorageScope(): StorageScope {
  currentScope = readPersistedScope()
  return currentScope
}

function normalizeSuffix(suffix: string): string {
  return suffix.startsWith(LEGACY_PREFIX) ? suffix.slice(LEGACY_PREFIX.length) : suffix
}

export function scopeStorageKey(scope: StorageScope, suffix: string): string {
  return `${SCOPE_PREFIX}${scope}:${normalizeSuffix(suffix)}`
}

/** Resolve a data suffix to the active scope's localStorage key. */
export function scopedStorageKey(suffix: string): string {
  return scopeStorageKey(currentScope, suffix)
}

function migrateLegacyKeysToScope(scope: StorageScope): void {
  if (typeof window === 'undefined') return
  for (const suffix of SCOPED_DATA_SUFFIXES) {
    const legacyKey = `${LEGACY_PREFIX}${suffix}`
    const targetKey = scopeStorageKey(scope, suffix)
    try {
      const legacy = localStorage.getItem(legacyKey)
      if (legacy !== null && localStorage.getItem(targetKey) === null) {
        localStorage.setItem(targetKey, legacy)
        localStorage.removeItem(legacyKey)
      }
    } catch {
      // ignore quota / privacy errors
    }
  }
}

export function setStorageScope(scope: StorageScope): void {
  if (typeof window !== 'undefined' && scope === 'local') {
    migrateLegacyKeysToScope('local')
  }
  currentScope = scope
  persistActiveScope(scope)
}

export function applyStorageScopeFromSession(
  mode: SessionMode | null,
  userId: string | null,
): void {
  if (mode === 'local') {
    setStorageScope('local')
  } else if (mode === 'cloud' && userId) {
    setStorageScope(`cloud:${userId}`)
  }
}

export function clearScopeData(scope: StorageScope = currentScope): void {
  if (typeof window === 'undefined') return
  for (const suffix of SCOPED_DATA_SUFFIXES) {
    try {
      localStorage.removeItem(scopeStorageKey(scope, suffix))
    } catch {
      // ignore
    }
  }
}

export function clearCurrentScopeData(): void {
  clearScopeData(currentScope)
}

/** Legacy unscoped keys (pre user-scope migration). */
export const LEGACY_LOCAL_STORAGE_KEYS = SCOPED_DATA_SUFFIXES.map(
  (suffix) => `${LEGACY_PREFIX}${suffix}`,
)

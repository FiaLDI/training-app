import { beforeEach, describe, expect, it } from 'vitest'

import {
  createOfflineCollection,
  createOfflineKv,
  flushOfflineDb,
  hasPendingLocalRevision,
  hydrateLocalDb,
  markRecordSynced,
  reloadOfflineDb,
  resetOfflineDb,
} from '@/shared/lib/offline-db'
import { scopeStorageKey, setStorageScope } from '@/shared/lib/storage-scope'

type Row = { id: string; name: string; updatedAt: string }

const collection = createOfflineCollection<Row>('exercises')
const outbox = createOfflineKv<Array<{ op: string; id: string }>>('catalog-outbox')

describe('offline-db', () => {
  beforeEach(async () => {
    await resetOfflineDb()
    localStorage.clear()
    setStorageScope('local')
  })

  it('keeps newest-first order and round-trips through IndexedDB', async () => {
    collection.upsert({ id: 'a', name: 'A', updatedAt: '1' })
    collection.upsert({ id: 'b', name: 'B', updatedAt: '2' })
    expect(collection.list().map((item) => item.id)).toEqual(['b', 'a'])

    await reloadOfflineDb()

    expect(collection.list().map((item) => item.id)).toEqual(['b', 'a'])
    expect(collection.get('a')?.name).toBe('A')
  })

  it('migrates scoped localStorage collections and outboxes once', async () => {
    localStorage.setItem(
      scopeStorageKey('local', 'exercises'),
      JSON.stringify([{ id: 'legacy', name: 'From LS', updatedAt: '1' }]),
    )
    localStorage.setItem(
      scopeStorageKey('local', 'catalog-outbox'),
      JSON.stringify([{ entity: 'exercise', op: 'upsert', id: 'legacy' }]),
    )

    await hydrateLocalDb()

    expect(collection.get('legacy')?.name).toBe('From LS')
    expect(hasPendingLocalRevision('exercises', 'legacy')).toBe(true)
    expect(outbox.get()).toEqual([{ entity: 'exercise', op: 'upsert', id: 'legacy' }])
    expect(localStorage.getItem(scopeStorageKey('local', 'exercises'))).toBeNull()
    expect(localStorage.getItem(scopeStorageKey('local', 'catalog-outbox'))).toBeNull()

    localStorage.setItem(
      scopeStorageKey('local', 'exercises'),
      JSON.stringify([{ id: 'ignored', name: 'No', updatedAt: '9' }]),
    )
    await hydrateLocalDb()
    expect(collection.get('ignored')).toBeNull()
    expect(collection.get('legacy')?.name).toBe('From LS')
  })

  it('does not overwrite pending local revisions from a server snapshot', () => {
    collection.upsert({ id: 'ex-1', name: 'Local', updatedAt: '2026-08-31T12:00:00.000Z' })
    expect(hasPendingLocalRevision('exercises', 'ex-1')).toBe(true)

    if (!hasPendingLocalRevision('exercises', 'ex-1')) {
      collection.upsert(
        { id: 'ex-1', name: 'Server', updatedAt: '2026-08-31T13:00:00.000Z' },
        'server',
      )
    }

    expect(collection.get('ex-1')?.name).toBe('Local')

    markRecordSynced('exercises', 'ex-1')
    expect(hasPendingLocalRevision('exercises', 'ex-1')).toBe(false)

    collection.upsert(
      { id: 'ex-1', name: 'Server', updatedAt: '2026-08-31T13:00:00.000Z' },
      'server',
    )
    expect(collection.get('ex-1')?.name).toBe('Server')
    expect(hasPendingLocalRevision('exercises', 'ex-1')).toBe(false)
  })

  it('isolates scopes in IndexedDB', async () => {
    collection.upsert({ id: 'local-row', name: 'Local', updatedAt: '1' })
    await flushOfflineDb()

    setStorageScope('cloud:user-a')
    expect(collection.list()).toEqual([])
    collection.upsert({ id: 'cloud-row', name: 'Cloud', updatedAt: '1' })
    await flushOfflineDb()

    setStorageScope('local')
    await hydrateLocalDb()
    expect(collection.list().map((item) => item.id)).toEqual(['local-row'])

    setStorageScope('cloud:user-a')
    await hydrateLocalDb()
    expect(collection.list().map((item) => item.id)).toEqual(['cloud-row'])
  })

  it('replace and delete persist across reload', async () => {
    collection.upsert({ id: 'keep', name: 'Keep', updatedAt: '1' })
    collection.upsert({ id: 'drop', name: 'Drop', updatedAt: '1' })
    collection.save([collection.get('keep')!])
    expect(collection.list().map((item) => item.id)).toEqual(['keep'])

    await reloadOfflineDb()
    expect(collection.list().map((item) => item.id)).toEqual(['keep'])

    collection.remove('keep')
    await reloadOfflineDb()
    expect(collection.list()).toEqual([])
  })
})

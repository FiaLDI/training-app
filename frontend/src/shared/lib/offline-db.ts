import Dexie, { type Table } from 'dexie'

import {
  COLLECTION_SUFFIXES,
  getStorageScope,
  KV_SUFFIXES,
  scopeStorageKey,
  type StorageScope,
} from '@/shared/lib/storage-scope'

export type PersistOrigin = 'local' | 'server'

type RecordMeta<T = unknown> = {
  payload: T
  rev: number
  syncedRev: number
}

type CollectionState = {
  order: string[]
  byId: Map<string, RecordMeta>
}

export type RecordRow = {
  pk: string
  scope: string
  collection: string
  entityId: string
  rev: number
  syncedRev: number
  payload: unknown
}

export type KvRow = {
  pk: string
  scope: string
  key: string
  value: unknown
}

export type ColMetaRow = {
  pk: string
  scope: string
  collection: string
  order: string[]
}

export type MetaRow = {
  scope: string
  localStorageMigrated: boolean
}

export type WalOp =
  | {
      type: 'put'
      scope: string
      collection: string
      entityId: string
      payload: unknown
      rev: number
      syncedRev: number
    }
  | { type: 'delete'; scope: string; collection: string; entityId: string }
  | {
      type: 'replace'
      scope: string
      collection: string
      items: Array<{ entityId: string; payload: unknown; rev: number; syncedRev: number }>
    }
  | { type: 'ack'; scope: string; collection: string; entityId: string }
  | { type: 'kv-set'; scope: string; key: string; value: unknown }
  | { type: 'kv-delete'; scope: string; key: string }
  | { type: 'clear-scope'; scope: string }

type WalRow = WalOp & { id?: number }

class IronLogDB extends Dexie {
  records!: Table<RecordRow, string>
  kv!: Table<KvRow, string>
  colMeta!: Table<ColMetaRow, string>
  wal!: Table<WalRow, number>
  meta!: Table<MetaRow, string>

  constructor() {
    super('ironlog')
    this.version(1).stores({
      records: 'pk, [scope+collection], scope',
      kv: 'pk, scope',
      colMeta: 'pk, scope',
      wal: '++id, scope',
      meta: 'scope',
    })
  }
}

function recordPk(scope: string, collection: string, entityId: string) {
  return `${scope}\t${collection}\t${entityId}`
}

function kvPk(scope: string, key: string) {
  return `${scope}\t${key}`
}

function colMetaPk(scope: string, collection: string) {
  return `${scope}\t${collection}`
}

function collectionKey(scope: string, collection: string) {
  return `${scope}\t${collection}`
}

const collections = new Map<string, CollectionState>()
const kvMemory = new Map<string, unknown>()

let dbPromise: Promise<IronLogDB | null> | null = null
let writeChain: Promise<void> = Promise.resolve()
let pendingOps: WalOp[] = []
let drainScheduled = false
let epoch = 0
let lifecycleBound = false

function emptyCollection(): CollectionState {
  return { order: [], byId: new Map() }
}

function getCollection(scope: string, collection: string): CollectionState {
  const key = collectionKey(scope, collection)
  let state = collections.get(key)
  if (!state) {
    state = emptyCollection()
    collections.set(key, state)
  }
  return state
}

function clonePayload<T>(value: T): T {
  return structuredClone(value)
}

async function openDb(): Promise<IronLogDB | null> {
  if (typeof indexedDB === 'undefined') return null
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const db = new IronLogDB()
        await db.open()
        return db
      } catch (error) {
        console.warn('[ironlog] IndexedDB unavailable, staying in-memory', error)
        return null
      }
    })()
  }
  return dbPromise
}

function applyOpToMemory(op: WalOp) {
  if (op.type === 'put') {
    const state = getCollection(op.scope, op.collection)
    const existed = state.byId.has(op.entityId)
    state.byId.set(op.entityId, {
      payload: op.payload,
      rev: op.rev,
      syncedRev: op.syncedRev,
    })
    if (!existed) state.order.unshift(op.entityId)
    return
  }
  if (op.type === 'delete') {
    const state = getCollection(op.scope, op.collection)
    state.byId.delete(op.entityId)
    state.order = state.order.filter((id) => id !== op.entityId)
    return
  }
  if (op.type === 'replace') {
    const state = getCollection(op.scope, op.collection)
    state.byId.clear()
    state.order = op.items.map((item) => item.entityId)
    for (const item of op.items) {
      state.byId.set(item.entityId, {
        payload: item.payload,
        rev: item.rev,
        syncedRev: item.syncedRev,
      })
    }
    return
  }
  if (op.type === 'ack') {
    const state = getCollection(op.scope, op.collection)
    const current = state.byId.get(op.entityId)
    if (!current) return
    state.byId.set(op.entityId, { ...current, syncedRev: current.rev })
    return
  }
  if (op.type === 'kv-set') {
    kvMemory.set(kvPk(op.scope, op.key), op.value)
    return
  }
  if (op.type === 'kv-delete') {
    kvMemory.delete(kvPk(op.scope, op.key))
    return
  }
  clearMemoryScope(op.scope)
}

function clearMemoryScope(scope: string) {
  for (const key of [...collections.keys()]) {
    if (key.startsWith(`${scope}\t`)) collections.delete(key)
  }
  for (const key of [...kvMemory.keys()]) {
    if (key.startsWith(`${scope}\t`)) kvMemory.delete(key)
  }
}

function clearAllMemory() {
  collections.clear()
  kvMemory.clear()
}

async function applyOpToIdb(db: IronLogDB, op: WalOp) {
  if (op.type === 'put') {
    const stateOrder = getCollection(op.scope, op.collection).order
    await db.records.put({
      pk: recordPk(op.scope, op.collection, op.entityId),
      scope: op.scope,
      collection: op.collection,
      entityId: op.entityId,
      rev: op.rev,
      syncedRev: op.syncedRev,
      payload: op.payload,
    })
    await db.colMeta.put({
      pk: colMetaPk(op.scope, op.collection),
      scope: op.scope,
      collection: op.collection,
      order: [...stateOrder],
    })
    return
  }
  if (op.type === 'delete') {
    await db.records.delete(recordPk(op.scope, op.collection, op.entityId))
    const stateOrder = getCollection(op.scope, op.collection).order
    await db.colMeta.put({
      pk: colMetaPk(op.scope, op.collection),
      scope: op.scope,
      collection: op.collection,
      order: [...stateOrder],
    })
    return
  }
  if (op.type === 'replace') {
    const existing = await db.records.where('[scope+collection]').equals([op.scope, op.collection]).toArray()
    const keep = new Set(op.items.map((item) => item.entityId))
    await db.records.bulkDelete(
      existing.filter((row) => !keep.has(row.entityId)).map((row) => row.pk),
    )
    if (op.items.length > 0) {
      await db.records.bulkPut(
        op.items.map((item) => ({
          pk: recordPk(op.scope, op.collection, item.entityId),
          scope: op.scope,
          collection: op.collection,
          entityId: item.entityId,
          rev: item.rev,
          syncedRev: item.syncedRev,
          payload: item.payload,
        })),
      )
    }
    await db.colMeta.put({
      pk: colMetaPk(op.scope, op.collection),
      scope: op.scope,
      collection: op.collection,
      order: op.items.map((item) => item.entityId),
    })
    return
  }
  if (op.type === 'ack') {
    const pk = recordPk(op.scope, op.collection, op.entityId)
    const row = await db.records.get(pk)
    if (!row) return
    await db.records.put({ ...row, syncedRev: row.rev })
    return
  }
  if (op.type === 'kv-set') {
    await db.kv.put({
      pk: kvPk(op.scope, op.key),
      scope: op.scope,
      key: op.key,
      value: op.value,
    })
    return
  }
  if (op.type === 'kv-delete') {
    await db.kv.delete(kvPk(op.scope, op.key))
    return
  }
  await Promise.all([
    db.records.where('scope').equals(op.scope).delete(),
    db.kv.where('scope').equals(op.scope).delete(),
    db.colMeta.where('scope').equals(op.scope).delete(),
    db.meta.delete(op.scope),
  ])
}

async function persistBatch(ops: WalOp[], batchEpoch: number) {
  if (ops.length === 0) return
  const db = await openDb()
  if (!db || batchEpoch !== epoch) return
  await db.transaction('rw', db.records, db.kv, db.colMeta, db.wal, db.meta, async () => {
    if (batchEpoch !== epoch) return
    const walIds: number[] = []
    for (const op of ops) {
      walIds.push(await db.wal.add(op))
    }
    for (const op of ops) {
      await applyOpToIdb(db, op)
    }
    await db.wal.bulkDelete(walIds)
  })
}

function scheduleDrain() {
  if (drainScheduled) return
  drainScheduled = true
  const batchEpoch = epoch
  writeChain = writeChain
    .then(async () => {
      drainScheduled = false
      const ops = pendingOps
      pendingOps = []
      await persistBatch(ops, batchEpoch)
    })
    .catch((error) => {
      drainScheduled = false
      console.error('[ironlog] IndexedDB write failed', error)
    })
}

function enqueue(op: WalOp) {
  applyOpToMemory(op)
  pendingOps.push(op)
  scheduleDrain()
}

export function flushOfflineDb(): Promise<void> {
  scheduleDrain()
  return writeChain
}

async function replayWal(db: IronLogDB, scope: StorageScope) {
  const pending = await db.wal.where('scope').equals(scope).sortBy('id')
  if (pending.length === 0) return
  await db.transaction('rw', db.records, db.kv, db.colMeta, db.wal, db.meta, async () => {
    for (const row of pending) {
      const { id, ...op } = row
      applyOpToMemory(op)
      await applyOpToIdb(db, op)
      if (id != null) await db.wal.delete(id)
    }
  })
}

function readLocalStorageJson(scope: StorageScope, suffix: string): unknown | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(scopeStorageKey(scope, suffix))
    if (raw == null) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

function removeLocalStorageSuffix(scope: StorageScope, suffix: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(scopeStorageKey(scope, suffix))
  } catch {
    // ignore
  }
}

async function migrateFromLocalStorage(db: IronLogDB, scope: StorageScope) {
  const existing = await db.meta.get(scope)
  if (existing?.localStorageMigrated) return

  const ops: WalOp[] = []
  for (const suffix of COLLECTION_SUFFIXES) {
    const parsed = readLocalStorageJson(scope, suffix)
    if (!Array.isArray(parsed)) continue
    const items = parsed
      .filter((item): item is { id: string } => Boolean(item) && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string')
      .map((item) => ({
        entityId: item.id,
        payload: item,
        rev: 1,
        syncedRev: 1,
      }))
    ops.push({ type: 'replace', scope, collection: suffix, items })
  }
  for (const suffix of KV_SUFFIXES) {
    const parsed = readLocalStorageJson(scope, suffix)
    if (parsed === undefined) continue
    ops.push({ type: 'kv-set', scope, key: suffix, value: parsed })
  }

  if (ops.length > 0) {
    await db.transaction('rw', db.records, db.kv, db.colMeta, db.wal, db.meta, async () => {
      for (const op of ops) {
        applyOpToMemory(op)
        await applyOpToIdb(db, op)
      }
    })
  }

  const catalogOutbox = kvMemory.get(kvPk(scope, 'catalog-outbox'))
  if (Array.isArray(catalogOutbox)) {
    for (const entry of catalogOutbox) {
      if (!entry || typeof entry !== 'object') continue
      const id = (entry as { id?: unknown }).id
      const op = (entry as { op?: unknown }).op
      if (typeof id !== 'string' || op !== 'upsert') continue
      const state = getCollection(scope, 'exercises')
      const current = state.byId.get(id)
      if (!current) continue
      const ack: WalOp = {
        type: 'put',
        scope,
        collection: 'exercises',
        entityId: id,
        payload: current.payload,
        rev: current.rev,
        syncedRev: 0,
      }
      applyOpToMemory(ack)
      await applyOpToIdb(db, ack)
    }
  }

  for (const suffix of [...COLLECTION_SUFFIXES, ...KV_SUFFIXES]) {
    removeLocalStorageSuffix(scope, suffix)
  }
  await db.meta.put({ scope, localStorageMigrated: true })
}

async function loadScopeFromIdb(db: IronLogDB, scope: StorageScope) {
  const [rows, metas, kvRows] = await Promise.all([
    db.records.where('scope').equals(scope).toArray(),
    db.colMeta.where('scope').equals(scope).toArray(),
    db.kv.where('scope').equals(scope).toArray(),
  ])

  for (const key of [...collections.keys()]) {
    if (key.startsWith(`${scope}\t`)) collections.delete(key)
  }
  for (const key of [...kvMemory.keys()]) {
    if (key.startsWith(`${scope}\t`)) kvMemory.delete(key)
  }

  const byCollection = new Map<string, RecordRow[]>()
  for (const row of rows) {
    const list = byCollection.get(row.collection) ?? []
    list.push(row)
    byCollection.set(row.collection, list)
  }
  const orderByCollection = new Map(metas.map((meta) => [meta.collection, meta.order]))

  for (const [collection, list] of byCollection) {
    const state = emptyCollection()
    const savedOrder = orderByCollection.get(collection)
    const ids = savedOrder?.length
      ? savedOrder.filter((id) => list.some((row) => row.entityId === id))
      : list.map((row) => row.entityId)
    const leftover = list.filter((row) => !ids.includes(row.entityId)).map((row) => row.entityId)
    state.order = [...ids, ...leftover]
    for (const row of list) {
      state.byId.set(row.entityId, {
        payload: row.payload,
        rev: row.rev,
        syncedRev: row.syncedRev,
      })
    }
    collections.set(collectionKey(scope, collection), state)
  }

  for (const row of kvRows) {
    kvMemory.set(kvPk(row.scope, row.key), row.value)
  }
}

function bindLifecycle() {
  if (lifecycleBound || typeof window === 'undefined') return
  lifecycleBound = true
  const flush = () => {
    void flushOfflineDb()
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

let hydrateLock: Promise<void> = Promise.resolve()

async function doHydrate(): Promise<void> {
  const scope = getStorageScope()
  const db = await openDb()
  await flushOfflineDb()
  if (db) {
    await replayWal(db, scope)
    await migrateFromLocalStorage(db, scope)
    await loadScopeFromIdb(db, scope)
  }
  bindLifecycle()
  if (typeof navigator !== 'undefined') {
    void navigator.storage?.persist?.()
  }
}

export function hydrateLocalDb(): Promise<void> {
  const run = hydrateLock.then(doHydrate)
  hydrateLock = run.catch(() => {})
  return run
}

export function clearOfflineScope(scope: StorageScope = getStorageScope()) {
  enqueue({ type: 'clear-scope', scope })
}

export async function reloadOfflineDb(): Promise<void> {
  await flushOfflineDb()
  clearAllMemory()
  await hydrateLocalDb()
}

export async function resetOfflineDb(): Promise<void> {
  epoch += 1
  pendingOps = []
  drainScheduled = false
  const previousWrite = writeChain
  const previousHydrate = hydrateLock
  writeChain = Promise.resolve()
  hydrateLock = Promise.resolve()
  await previousWrite.catch(() => {})
  await previousHydrate.catch(() => {})
  clearAllMemory()
  const db = await openDb()
  if (!db) return
  await db.transaction('rw', db.records, db.kv, db.colMeta, db.wal, db.meta, async () => {
    await Promise.all([
      db.records.clear(),
      db.kv.clear(),
      db.colMeta.clear(),
      db.wal.clear(),
      db.meta.clear(),
    ])
  })
}

export function hasPendingLocalRevision(collection: string, id: string): boolean {
  const meta = getCollection(getStorageScope(), collection).byId.get(id)
  if (!meta) return false
  return meta.rev > meta.syncedRev
}

export function markRecordSynced(collection: string, id: string) {
  const scope = getStorageScope()
  if (!getCollection(scope, collection).byId.has(id)) return
  enqueue({ type: 'ack', scope, collection, entityId: id })
}

export function createOfflineCollection<T extends { id: string }>(suffix: string) {
  return {
    list(): T[] {
      const state = getCollection(getStorageScope(), suffix)
      return state.order
        .map((id) => state.byId.get(id)?.payload as T | undefined)
        .filter((item): item is T => item != null)
        .map((item) => clonePayload(item))
    },
    save(items: T[], origin: PersistOrigin = 'local'): void {
      const scope = getStorageScope()
      const state = getCollection(scope, suffix)
      enqueue({
        type: 'replace',
        scope,
        collection: suffix,
        items: items.map((item) => {
          const current = state.byId.get(item.id)
          if (origin === 'server') {
            const rev = current?.rev ?? 1
            return { entityId: item.id, payload: clonePayload(item), rev, syncedRev: rev }
          }
          return {
            entityId: item.id,
            payload: clonePayload(item),
            rev: (current?.rev ?? 0) + 1,
            syncedRev: current?.syncedRev ?? 0,
          }
        }),
      })
    },
    get(id: string): T | null {
      const current = getCollection(getStorageScope(), suffix).byId.get(id)
      return current ? clonePayload(current.payload as T) : null
    },
    upsert(item: T, origin: PersistOrigin = 'local'): T {
      const scope = getStorageScope()
      const current = getCollection(scope, suffix).byId.get(item.id)
      const stored = clonePayload(item)
      let rev: number
      let syncedRev: number
      if (origin === 'server') {
        rev = current?.rev ?? 1
        syncedRev = rev
      } else {
        rev = (current?.rev ?? 0) + 1
        syncedRev = current?.syncedRev ?? 0
      }
      enqueue({
        type: 'put',
        scope,
        collection: suffix,
        entityId: item.id,
        payload: stored,
        rev,
        syncedRev,
      })
      return clonePayload(stored)
    },
    remove(id: string): boolean {
      const scope = getStorageScope()
      if (!getCollection(scope, suffix).byId.has(id)) return false
      enqueue({ type: 'delete', scope, collection: suffix, entityId: id })
      return true
    },
  }
}

export function createOfflineKv<T>(suffix: string) {
  return {
    get(): T | undefined {
      if (!kvMemory.has(kvPk(getStorageScope(), suffix))) return undefined
      return clonePayload(kvMemory.get(kvPk(getStorageScope(), suffix)) as T)
    },
    set(value: T): void {
      enqueue({
        type: 'kv-set',
        scope: getStorageScope(),
        key: suffix,
        value: clonePayload(value),
      })
    },
    remove(): void {
      enqueue({ type: 'kv-delete', scope: getStorageScope(), key: suffix })
    },
  }
}

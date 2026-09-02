import { exerciseApi } from '@/entities/exercise/api/exercise-api'
import type { Exercise } from '@/entities/exercise/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import {
  createOfflineKv,
  hasPendingLocalRevision,
  markRecordSynced,
} from '@/shared/lib/offline-db'

type OutboxOp = 'upsert' | 'delete'
type OutboxEntity = 'exercise'

type OutboxEntry = {
  entity: OutboxEntity
  op: OutboxOp
  id: string
}

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

const outboxKv = createOfflineKv<OutboxEntry[]>('catalog-outbox')

function readOutbox(): OutboxEntry[] {
  const stored = outboxKv.get()
  if (!Array.isArray(stored)) return []
  return stored.filter((item) => item.entity === 'exercise')
}

function writeOutbox(entries: OutboxEntry[]) {
  outboxKv.set(entries)
}

function clearOutboxStorage() {
  writeOutbox([])
}

function enqueue(entry: OutboxEntry) {
  const items = readOutbox().filter(
    (item) => !(item.entity === entry.entity && item.id === entry.id),
  )
  items.push(entry)
  writeOutbox(items)
}

function dequeue(entity: OutboxEntity, id: string) {
  writeOutbox(readOutbox().filter((item) => !(item.entity === entity && item.id === id)))
}

async function pushExercise(id: string, op: OutboxOp) {
  if (isLocalMode()) return
  const writeExtras = { timeoutMs: 12000 }
  if (op === 'delete') {
    await exerciseApi.remove(id, writeExtras)
    dequeue('exercise', id)
    return
  }
  const local = localData.exercises.get(id)
  if (!local) {
    dequeue('exercise', id)
    return
  }
  try {
    await exerciseApi.getById(id, { timeoutMs: 5000 })
    await exerciseApi.update(
      id,
      {
        name: local.name,
        description: local.description,
        muscleGroup: local.muscleGroup,
        difficulty: local.difficulty,
        metadata: local.metadata,
      },
      writeExtras,
    )
  } catch (error) {
    if (error instanceof ApiError && error.status !== 404) throw error
    const created = await exerciseApi.create(
      {
        id: local.id,
        name: local.name,
        description: local.description,
        muscleGroup: local.muscleGroup,
        difficulty: local.difficulty,
        metadata: local.metadata,
      },
      writeExtras,
    )
    localData.exercises.upsert({
      ...created,
      metadata: {
        ...created.metadata,
        catalogSyncedAt: new Date().toISOString(),
      },
    })
    markRecordSynced('exercises', id)
    dequeue('exercise', id)
    return
  }
  const synced = localData.exercises.get(id)
  if (synced) {
    localData.exercises.upsert({
      ...synced,
      metadata: {
        ...synced.metadata,
        catalogSyncedAt: new Date().toISOString(),
      },
    })
    markRecordSynced('exercises', id)
  }
  dequeue('exercise', id)
}

export type PendingCatalogItem = {
  entity: OutboxEntity
  op: OutboxOp
  id: string
  name: string
}

export const catalogSync = {
  enqueueUpsert(entity: OutboxEntity, id: string) {
    enqueue({ entity, op: 'upsert', id })
  },

  enqueueDelete(entity: OutboxEntity, id: string) {
    enqueue({ entity, op: 'delete', id })
  },

  pendingCount() {
    return readOutbox().length
  },

  listPending(): PendingCatalogItem[] {
    return readOutbox().map((entry) => {
      const local = localData.exercises.get(entry.id)
      return {
        ...entry,
        name:
          local?.name ??
          (entry.op === 'delete' ? 'Упражнение (удаление)' : 'Упражнение'),
      }
    })
  },

  clearOutbox() {
    clearOutboxStorage()
  },

  async flush(
    onItem?: (item: PendingCatalogItem, ok: boolean, error?: string) => void,
    only?: Array<{ entity: OutboxEntity; id: string }>,
  ) {
    if (isLocalMode()) return
    const allow = only
      ? new Set(only.map((item) => `${item.entity}:${item.id}`))
      : null
    const entries = [...readOutbox()].filter((entry) =>
      allow ? allow.has(`${entry.entity}:${entry.id}`) : true,
    )
    const labeledAll = catalogSync.listPending()

    for (const entry of entries) {
      const labeled =
        labeledAll.find((item) => item.entity === entry.entity && item.id === entry.id) ??
        ({
          ...entry,
          name: 'Упражнение',
        } satisfies PendingCatalogItem)
      try {
        await pushExercise(entry.id, entry.op)
        onItem?.(labeled, true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка'
        onItem?.(labeled, false, message)
      }
    }
  },

  async mergeFromServer(options?: { timeoutMs?: number }) {
    if (isLocalMode()) return
    const pendingDeletes = new Set(
      readOutbox().filter((entry) => entry.op === 'delete').map((entry) => entry.id),
    )
    const pendingUpserts = new Set(
      readOutbox().filter((entry) => entry.op === 'upsert').map((entry) => entry.id),
    )
    try {
      const exercises = await exerciseApi.list({
        limit: 200,
        timeoutMs: options?.timeoutMs ?? 5000,
      })
      const serverIds = new Set(exercises.items.map((item) => item.id))
      for (const item of exercises.items) {
        if (pendingDeletes.has(item.id)) continue
        const local = localData.exercises.get(item.id)
        if (pendingUpserts.has(item.id) || hasPendingLocalRevision('exercises', item.id)) {
          continue
        }
        if (!local || local.updatedAt <= item.updatedAt) {
          localData.exercises.upsert(
            {
              ...item,
              userId: item.userId ?? null,
              metadata: {
                ...item.metadata,
                catalogSyncedAt:
                  (item.metadata?.catalogSyncedAt as string | undefined) ??
                  new Date().toISOString(),
              },
            },
            'server',
          )
        }
      }
      for (const local of localData.exercises.list()) {
        // Keep pending local customs and unsynced drafts; only drop previously synced
        // rows that the server no longer returns for this user (system ∪ mine).
        if (
          !serverIds.has(local.id) &&
          local.metadata?.catalogSyncedAt &&
          !pendingUpserts.has(local.id) &&
          !pendingDeletes.has(local.id) &&
          !hasPendingLocalRevision('exercises', local.id)
        ) {
          localData.exercises.remove(local.id)
        }
      }
    } catch {
      // offline / slow — keep local catalog
    }
    await catalogSync.flush()
  },

  async createExercise(input: Parameters<typeof localData.exercises.create>[0]): Promise<Exercise> {
    const exercise = localData.exercises.create(input)
    if (isLocalMode()) {
      return localData.exercises.get(exercise.id) ?? exercise
    }
    catalogSync.enqueueUpsert('exercise', exercise.id)
    try {
      await pushExercise(exercise.id, 'upsert')
    } catch {
      // stays in outbox
    }
    return localData.exercises.get(exercise.id) ?? exercise
  },

  async updateExercise(
    id: string,
    input: Parameters<typeof localData.exercises.update>[1],
  ): Promise<Exercise> {
    if (input.isSystem === true) {
      if (isLocalMode()) {
        const local = localData.exercises.update(id, input)
        if (!local) throw new Error('Упражнение не найдено')
        return local
      }
      try {
        const updated = await exerciseApi.update(id, input, { timeoutMs: 12000 })
        localData.exercises.upsert({
          ...updated,
          metadata: {
            ...updated.metadata,
            catalogSyncedAt: new Date().toISOString(),
          },
        })
        dequeue('exercise', id)
        markRecordSynced('exercises', id)
        return localData.exercises.get(id) ?? updated
      } catch (error) {
        // Fall back to local promote if offline
        const local = localData.exercises.update(id, input)
        if (!local) throw error instanceof Error ? error : new Error('Упражнение не найдено')
        catalogSync.enqueueUpsert('exercise', id)
        throw error
      }
    }

    const exercise = localData.exercises.update(id, input)
    if (!exercise) throw new Error('Упражнение не найдено')
    if (isLocalMode()) {
      return localData.exercises.get(id) ?? exercise
    }
    catalogSync.enqueueUpsert('exercise', id)
    try {
      await pushExercise(id, 'upsert')
    } catch {
      // stays in outbox
    }
    return localData.exercises.get(id) ?? exercise
  },

  async removeExercise(id: string) {
    localData.exercises.remove(id)
    if (isLocalMode()) return
    catalogSync.enqueueDelete('exercise', id)
    try {
      await pushExercise(id, 'delete')
    } catch {
      // stays in outbox
    }
  },
}

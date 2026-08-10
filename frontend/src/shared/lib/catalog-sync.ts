import { equipmentApi } from '@/entities/equipment/api/equipment-api'
import type { Equipment } from '@/entities/equipment/model/types'
import { exerciseApi } from '@/entities/exercise/api/exercise-api'
import type { Exercise } from '@/entities/exercise/model/types'
import { ApiError, isRetriableWriteError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'

const OUTBOX_KEY = 'ironlog:local:catalog-outbox'

type OutboxOp = 'upsert' | 'delete'
type OutboxEntity = 'exercise' | 'equipment'

type OutboxEntry = {
  entity: OutboxEntity
  op: OutboxOp
  id: string
}

function readOutbox(): OutboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OutboxEntry[]
  } catch {
    return []
  }
}

function writeOutbox(entries: OutboxEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries))
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
  if (op === 'delete') {
    await exerciseApi.remove(id)
    dequeue('exercise', id)
    return
  }
  const local = localData.exercises.get(id)
  if (!local) {
    dequeue('exercise', id)
    return
  }
  try {
    await exerciseApi.getById(id)
    await exerciseApi.update(id, {
      name: local.name,
      description: local.description,
      muscleGroup: local.muscleGroup,
      equipment: local.equipment,
      difficulty: local.difficulty,
      metadata: local.metadata,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status !== 404) throw error
    await exerciseApi.create({
      id: local.id,
      name: local.name,
      description: local.description,
      muscleGroup: local.muscleGroup,
      equipment: local.equipment,
      difficulty: local.difficulty,
      metadata: local.metadata,
    })
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
  }
  dequeue('exercise', id)
}

async function pushEquipment(id: string, op: OutboxOp) {
  if (op === 'delete') {
    await equipmentApi.remove(id)
    dequeue('equipment', id)
    return
  }
  const local = localData.equipment.get(id)
  if (!local) {
    dequeue('equipment', id)
    return
  }
  const remote = await equipmentApi.create({
    id: local.id,
    name: local.name,
    metadata: local.metadata,
  })
  if (remote.id !== local.id) {
    localData.equipment.replaceId(local.id, {
      ...remote,
      metadata: {
        ...remote.metadata,
        catalogSyncedAt: new Date().toISOString(),
      },
    })
    dequeue('equipment', local.id)
    dequeue('equipment', remote.id)
    return
  }
  const synced = localData.equipment.get(id)
  if (synced) {
    localData.equipment.upsert({
      ...synced,
      metadata: {
        ...synced.metadata,
        catalogSyncedAt: new Date().toISOString(),
      },
    })
  }
  dequeue('equipment', id)
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
      if (entry.entity === 'exercise') {
        const local = localData.exercises.get(entry.id)
        return {
          ...entry,
          name:
            local?.name ??
            (entry.op === 'delete' ? `Упражнение (удаление)` : 'Упражнение'),
        }
      }
      const local = localData.equipment.get(entry.id)
      return {
        ...entry,
        name:
          local?.name ??
          (entry.op === 'delete' ? `Инвентарь (удаление)` : 'Инвентарь'),
      }
    })
  },

  async flush(
    onItem?: (item: PendingCatalogItem, ok: boolean, error?: string) => void,
    only?: Array<{ entity: OutboxEntity; id: string }>,
  ) {
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
          name: entry.entity === 'exercise' ? 'Упражнение' : 'Инвентарь',
        } satisfies PendingCatalogItem)
      try {
        if (entry.entity === 'exercise') await pushExercise(entry.id, entry.op)
        else await pushEquipment(entry.id, entry.op)
        onItem?.(labeled, true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка'
        onItem?.(labeled, false, message)
      }
    }
  },

  async mergeFromServer() {
    try {
      const [exercises, equipment] = await Promise.all([
        exerciseApi.list({ limit: 200 }),
        equipmentApi.list({ limit: 200 }),
      ])
  for (const item of exercises.items) {
        const local = localData.exercises.get(item.id)
        if (!local || local.updatedAt <= item.updatedAt) {
          localData.exercises.upsert({
            ...item,
            metadata: {
              ...item.metadata,
              catalogSyncedAt:
                (item.metadata?.catalogSyncedAt as string | undefined) ??
                new Date().toISOString(),
            },
          })
        }
      }
      for (const item of equipment.items) {
        localData.equipment.upsert({
          ...item,
          metadata: {
            ...item.metadata,
            catalogSyncedAt:
              (item.metadata?.catalogSyncedAt as string | undefined) ??
              new Date().toISOString(),
          },
        })
      }
    } catch {
      // offline — keep local catalog
    }
    await catalogSync.flush()
  },

  async createExercise(input: Parameters<typeof localData.exercises.create>[0]): Promise<Exercise> {
    const exercise = localData.exercises.create(input)
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
    const exercise = localData.exercises.update(id, input)
    if (!exercise) throw new Error('Упражнение не найдено')
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
    catalogSync.enqueueDelete('exercise', id)
    try {
      await pushExercise(id, 'delete')
    } catch {
      // stays in outbox
    }
  },

  async createEquipment(
    input: Parameters<typeof localData.equipment.create>[0],
  ): Promise<Equipment> {
    const equipment = localData.equipment.create(input)
    catalogSync.enqueueUpsert('equipment', equipment.id)
    try {
      await pushEquipment(equipment.id, 'upsert')
    } catch {
      // stays in outbox
    }
    return localData.equipment.get(equipment.id) ??
      localData.equipment.list().find((item) => item.name === equipment.name) ??
      equipment
  },

  async removeEquipment(id: string) {
    localData.equipment.remove(id)
    catalogSync.enqueueDelete('equipment', id)
    try {
      await pushEquipment(id, 'delete')
    } catch {
      // stays in outbox
    }
  },
}

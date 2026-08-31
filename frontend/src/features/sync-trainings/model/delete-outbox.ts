import { createOfflineKv } from '@/shared/lib/offline-db'

export type DeleteOutboxEntity =
  | 'training'
  | 'template'
  | 'training-exercise'
  | 'training-set'
  | 'training-group'
  | 'template-exercise'
  | 'template-group'

export type DeleteOutboxEntry = {
  entity: DeleteOutboxEntity
  id: string
}

const ENTITIES = new Set<DeleteOutboxEntity>([
  'training',
  'template',
  'training-exercise',
  'training-set',
  'training-group',
  'template-exercise',
  'template-group',
])

const outboxKv = createOfflineKv<DeleteOutboxEntry[]>('entity-delete-outbox')

function readOutbox(): DeleteOutboxEntry[] {
  const stored = outboxKv.get()
  if (!Array.isArray(stored)) return []
  return stored.filter((item) => ENTITIES.has(item.entity) && typeof item.id === 'string')
}

function writeOutbox(entries: DeleteOutboxEntry[]) {
  outboxKv.set(entries)
}

export const deleteOutbox = {
  enqueue(entity: DeleteOutboxEntity, id: string) {
    const items = readOutbox().filter(
      (item) => !(item.entity === entity && item.id === id),
    )
    items.push({ entity, id })
    writeOutbox(items)
  },

  dequeue(entity: DeleteOutboxEntity, id: string) {
    writeOutbox(readOutbox().filter((item) => !(item.entity === entity && item.id === id)))
  },

  list(): DeleteOutboxEntry[] {
    return readOutbox()
  },

  clear() {
    writeOutbox([])
  },
}

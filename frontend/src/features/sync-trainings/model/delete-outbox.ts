import { scopedStorageKey } from '@/shared/lib/storage-scope'

const OUTBOX_SUFFIX = 'entity-delete-outbox'

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

function outboxKey() {
  return scopedStorageKey(OUTBOX_SUFFIX)
}

function readOutbox(): DeleteOutboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(outboxKey())
    if (!raw) return []
    const parsed = JSON.parse(raw) as DeleteOutboxEntry[]
    return parsed.filter(
      (item) => ENTITIES.has(item.entity) && typeof item.id === 'string',
    )
  } catch {
    return []
  }
}

function writeOutbox(entries: DeleteOutboxEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(outboxKey(), JSON.stringify(entries))
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

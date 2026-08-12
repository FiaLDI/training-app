const OUTBOX_KEY = 'ironlog:local:entity-delete-outbox'

export type DeleteOutboxEntity = 'training' | 'template'

export type DeleteOutboxEntry = {
  entity: DeleteOutboxEntity
  id: string
}

function readOutbox(): DeleteOutboxEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DeleteOutboxEntry[]
    return parsed.filter(
      (item) =>
        (item.entity === 'training' || item.entity === 'template') &&
        typeof item.id === 'string',
    )
  } catch {
    return []
  }
}

function writeOutbox(entries: DeleteOutboxEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries))
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

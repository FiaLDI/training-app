function readRaw<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeRaw<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

export function createLocalCollection<T extends { id: string }>(storageKey: string) {
  return {
    list(): T[] {
      return readRaw<T[]>(storageKey, [])
    },
    save(items: T[]): void {
      writeRaw(storageKey, items)
    },
    get(id: string): T | null {
      return this.list().find((item) => item.id === id) ?? null
    },
    upsert(item: T): T {
      const items = this.list()
      const index = items.findIndex((entry) => entry.id === item.id)
      if (index === -1) items.unshift(item)
      else items[index] = item
      this.save(items)
      return item
    },
    remove(id: string): boolean {
      const items = this.list()
      const next = items.filter((item) => item.id !== id)
      if (next.length === items.length) return false
      this.save(next)
      return true
    },
  }
}

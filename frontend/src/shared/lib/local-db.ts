import { createOfflineCollection } from '@/shared/lib/offline-db'

export function createLocalCollection<T extends { id: string }>(suffix: string) {
  return createOfflineCollection<T>(suffix)
}

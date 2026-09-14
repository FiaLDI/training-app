import { useExerciseStore } from '@/entities/exercise/model/store'
import {
  resetEntityStores,
  seedEntityStoresFromLocal,
} from '@/features/clear-local-data/model/clear-local-data'
import { localData } from '@/shared/lib/local-data'
import { flushOfflineDb, reloadOfflineDb } from '@/shared/lib/offline-db'
import {
  getStorageScope,
  restorePersistedStorageScope,
  setStorageScope,
} from '@/shared/lib/storage-scope'

import { hydrateClientStorage } from './session-boundary'

describe('hydrateClientStorage', () => {
  it('seeds stores from IndexedDB after a reload of the persisted cloud scope', async () => {
    setStorageScope('cloud:user-a')
    localData.exercises.create({ id: 'ex-1', name: 'Жим' })
    await flushOfflineDb()

    resetEntityStores()
    expect(useExerciseStore.getState().items).toHaveLength(0)

    setStorageScope('local')
    localStorage.setItem('ironlog:active-scope', 'cloud:user-a')
    restorePersistedStorageScope()
    expect(getStorageScope()).toBe('cloud:user-a')

    await reloadOfflineDb()
    seedEntityStoresFromLocal()
    expect(useExerciseStore.getState().items.some((item) => item.id === 'ex-1')).toBe(true)
  })

  it('fills empty stores from the active scope', async () => {
    setStorageScope('local')
    localData.exercises.create({ id: 'ex-local', name: 'Присед' })
    resetEntityStores()

    await hydrateClientStorage()
    expect(useExerciseStore.getState().items.some((item) => item.id === 'ex-local')).toBe(
      true,
    )
    expect(useExerciseStore.getState().loading).toBe(false)
  })
})

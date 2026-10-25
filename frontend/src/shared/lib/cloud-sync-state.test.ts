import { afterEach, describe, expect, it } from 'vitest'

import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'

import {
  persistSyncCollections,
  rememberTrainingWindow,
  trainingWindowNeedsFetch,
  type CloudSyncState,
} from './cloud-sync-state'

const live = (overrides: Partial<CloudSyncState> = {}): CloudSyncState => ({
  trainings: 1,
  templates: 1,
  programs: 1,
  exercises: 1,
  stats: 1,
  ...overrides,
})

describe('cloud sync state windows', () => {
  afterEach(() => {
    resetEntityStores()
  })

  it('refetches a week that was never listed, then skips while gen is unchanged', () => {
    setStorageScope('cloud:user-1')
    const state = live({ trainings: 4 })
    persistSyncCollections(state, ['trainings'])

    expect(trainingWindowNeedsFetch('from', 'to', state)).toBe(true)
    rememberTrainingWindow('from', 'to', 4)
    expect(trainingWindowNeedsFetch('from', 'to', state)).toBe(false)
    expect(trainingWindowNeedsFetch('from', 'to', live({ trainings: 5 }))).toBe(true)
  })
})

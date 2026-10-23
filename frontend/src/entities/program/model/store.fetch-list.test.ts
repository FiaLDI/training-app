import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/entities/session/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { localData } from '@/shared/lib/local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'

import { programApi } from '../api/program-api'
import { useProgramStore } from './store'

function cloudSession() {
  useSessionStore.setState({
    mode: 'cloud',
    user: {
      id: 'user-1',
      email: 'a@b.c',
      username: 'a',
      metadata: {},
      createdAt: '2026-09-02T00:00:00.000Z',
    },
    accessToken: 'token',
    hydrated: true,
  })
}

describe('program fetchList cache', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEntityStores()
  })

  it('shows local programs immediately without waiting for the network', async () => {
    setStorageScope('cloud:user-1')
    cloudSession()
    const program = localData.programs.create({ name: 'Моя неделя' })
    let resolveList: (value: { items: []; total: number; page: number; limit: number }) => void =
      () => {}
    vi.spyOn(programApi, 'list').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveList = resolve
        }),
    )

    const pending = useProgramStore.getState().fetchList()
    expect(useProgramStore.getState().loading).toBe(false)
    expect(useProgramStore.getState().listReady).toBe(true)
    expect(useProgramStore.getState().items.some((item) => item.id === program.id)).toBe(true)

    resolveList({ items: [], total: 0, page: 1, limit: 100 })
    await pending
  })
})

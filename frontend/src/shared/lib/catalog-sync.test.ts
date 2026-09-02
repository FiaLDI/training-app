import { afterEach, describe, expect, it, vi } from 'vitest'

import { exerciseApi } from '@/entities/exercise/api/exercise-api'
import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { catalogSync } from './catalog-sync'

describe('catalogSync local mode', () => {
  beforeEach(() => {
    useSessionStore.setState({
      mode: 'local',
      user: null,
      accessToken: null,
      hydrated: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not call the exercises API on mergeFromServer', async () => {
    const list = vi.spyOn(exerciseApi, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    })
    await catalogSync.mergeFromServer()
    expect(list).not.toHaveBeenCalled()
  })

  it('creates exercises only in IndexedDB without pushing', async () => {
    const create = vi.spyOn(exerciseApi, 'create')
    const exercise = await catalogSync.createExercise({ name: 'Приседания' })
    expect(exercise.name).toBe('Приседания')
    expect(localData.exercises.get(exercise.id)?.name).toBe('Приседания')
    expect(create).not.toHaveBeenCalled()
    expect(catalogSync.pendingCount()).toBe(0)
  })

  it('does not flush the outbox while local', async () => {
    const remove = vi.spyOn(exerciseApi, 'remove')
    await catalogSync.flush()
    expect(remove).not.toHaveBeenCalled()
  })
})

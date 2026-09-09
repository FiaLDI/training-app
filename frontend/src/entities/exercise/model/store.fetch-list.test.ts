import { useSessionStore } from '@/entities/session/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { localData } from '@/shared/lib/local-data'
import { setStorageScope } from '@/shared/lib/storage-scope'

import { filterExercisesByQuery } from '../lib/filter-exercises'

import { useExerciseStore } from './store'

describe('exercise catalog fetchList', () => {
  beforeEach(() => {
    localStorage.clear()
    setStorageScope('local')
    resetEntityStores()
    useSessionStore.setState({
      mode: 'local',
      user: null,
      accessToken: null,
      hydrated: true,
    })
  })

  it('keeps the full catalog when a leftover search query is set', async () => {
    localData.exercises.create({ id: 'ex-bench', name: 'Жим лёжа' })
    localData.exercises.create({ id: 'ex-squat', name: 'Приседание' })

    useExerciseStore.getState().setQuery('жим')
    await useExerciseStore.getState().fetchList()

    const names = useExerciseStore.getState().items.map((item) => item.name)
    expect(names).toEqual(expect.arrayContaining(['Жим лёжа', 'Приседание']))
    expect(useExerciseStore.getState().query).toBe('жим')
    expect(useExerciseStore.getState().loading).toBe(false)
  })

  it('clears leftover search query on session reset', () => {
    useExerciseStore.getState().setQuery('жим')
    resetEntityStores()
    expect(useExerciseStore.getState().query).toBe('')
  })
})

describe('filterExercisesByQuery', () => {
  const items = [
    { id: 'ex-bench', name: 'Жим лёжа' },
    { id: 'ex-squat', name: 'Приседание' },
  ] as const

  it('returns all items when the query is empty', () => {
    expect(filterExercisesByQuery([...items], '  ')).toHaveLength(2)
  })

  it('filters by name substring without mutating the catalog', () => {
    const filtered = filterExercisesByQuery([...items], 'жим')
    expect(filtered.map((item) => item.id)).toEqual(['ex-bench'])
  })
})

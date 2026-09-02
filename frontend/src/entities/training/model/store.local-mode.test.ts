import { useSessionStore } from '@/entities/session/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'
import { localData } from '@/shared/lib/local-data'

import { useTrainingStore } from './store'

describe('local mode fetchList', () => {
  beforeEach(() => {
    resetEntityStores()
    useSessionStore.setState({
      mode: 'local',
      user: null,
      accessToken: null,
      hydrated: true,
    })
  })

  it('clears training loading on an empty local catalog', async () => {
    await useTrainingStore.getState().fetchList()
    expect(useTrainingStore.getState().loading).toBe(false)
    expect(useTrainingStore.getState().items).toEqual([])
  })

  it('clears template loading on an empty local catalog', async () => {
    await useTemplateStore.getState().fetchList()
    expect(useTemplateStore.getState().loading).toBe(false)
    expect(useTemplateStore.getState().items).toEqual([])
  })

  it('returns locally stored trainings without leaving loading true', async () => {
    const training = localData.trainings.create({
      id: 'tr-local-1',
      status: 'planned',
      scheduledAt: '2026-09-02T12:00:00.000Z',
    })
    await useTrainingStore.getState().fetchList()
    expect(useTrainingStore.getState().loading).toBe(false)
    expect(useTrainingStore.getState().items.some((item) => item.id === training.id)).toBe(true)
  })
})

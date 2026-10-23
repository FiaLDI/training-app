import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSessionStore } from '@/entities/session/model/store'
import { resetEntityStores } from '@/features/clear-local-data/model/clear-local-data'

import { statsApi } from '../api/stats-api'
import { useStatsStore } from './store'

describe('stats store cache', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetEntityStores()
  })

  it('keeps the last overview while a refetch is in flight', async () => {
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

    vi.spyOn(statsApi, 'volume').mockResolvedValue({
      points: [{ date: '2026-09-01', volume: 1000 }],
    })
    vi.spyOn(statsApi, 'muscleGroups').mockResolvedValue({ groups: [] })
    vi.spyOn(statsApi, 'activity').mockResolvedValue({ points: [] })

    const range = { from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' }
    await useStatsStore.getState().loadOverview('day:month', range, range)

    expect(useStatsStore.getState().overviewByKey['day:month']?.volume[0]?.volume).toBe(1000)

    let resolveVolume: (value: { points: Array<{ date: string; volume: number }> }) => void = () => {}
    vi.spyOn(statsApi, 'volume').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVolume = resolve
        }),
    )

    const pending = useStatsStore.getState().loadOverview('day:month', range, range)
    expect(useStatsStore.getState().overviewByKey['day:month']?.volume[0]?.volume).toBe(1000)

    resolveVolume({ points: [{ date: '2026-09-01', volume: 2000 }] })
    await pending
    expect(useStatsStore.getState().overviewByKey['day:month']?.volume[0]?.volume).toBe(2000)
  })
})

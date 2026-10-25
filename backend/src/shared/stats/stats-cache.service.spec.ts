import { MemoryCacheAdapter } from '../cache/infrastructure/memory-cache.adapter'
import { StatsCacheService } from './stats-cache.service'

describe('StatsCacheService sync generations', () => {
  let cache: MemoryCacheAdapter
  let service: StatsCacheService

  beforeEach(() => {
    cache = new MemoryCacheAdapter()
    service = new StatsCacheService(cache)
  })

  afterEach(() => {
    cache.onModuleDestroy()
  })

  it('starts at zero and bumps collections independently of stats', async () => {
    await expect(service.getSyncState('user-1')).resolves.toEqual({
      trainings: 0,
      templates: 0,
      programs: 0,
      exercises: 0,
      stats: 0,
    })

    await service.bumpCollection('user-1', 'trainings')
    await service.bumpCollection('user-1', 'trainings')
    await service.invalidateUser('user-1')

    await expect(service.getSyncState('user-1')).resolves.toEqual({
      trainings: 2,
      templates: 0,
      programs: 0,
      exercises: 0,
      stats: 1,
    })
  })
})

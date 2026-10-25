import { StatsCacheService } from '../../../shared/stats/stats-cache.service'
import { User } from '../../auth/core/types'
import { SyncHttpController } from './sync.http-controller'

describe('SyncHttpController', () => {
  const user = { id: 'user-1' } as User

  it('returns collection generations for the current user', async () => {
    const statsCache = {
      getSyncState: jest.fn().mockResolvedValue({
        trainings: 3,
        templates: 1,
        programs: 0,
        exercises: 4,
        stats: 2,
      }),
    }
    const controller = new SyncHttpController(statsCache as unknown as StatsCacheService)

    await expect(controller.getState(user)).resolves.toEqual({
      trainings: 3,
      templates: 1,
      programs: 0,
      exercises: 4,
      stats: 2,
    })
    expect(statsCache.getSyncState).toHaveBeenCalledWith('user-1')
  })
})

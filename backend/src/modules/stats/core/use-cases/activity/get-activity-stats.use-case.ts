import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { ActivityStatPoint } from '../../../../training/core/types'
import { StatsCacheService } from '../../../../../shared/stats/stats-cache.service'

export interface GetActivityStatsInput {
  userId: string
  from: string
  to: string
}

export interface GetActivityStatsOutput {
  points: ActivityStatPoint[]
}

export class GetActivityStatsUseCase
  implements UseCase<GetActivityStatsInput, GetActivityStatsOutput>
{
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly statsCache: StatsCacheService,
  ) {}

  public async execute(input: GetActivityStatsInput): Promise<GetActivityStatsOutput> {
    const periodKey = this.statsCache.periodKey(input.from, input.to)
    const cacheable = this.statsCache.isPeriodCompleted(input.to)

    if (cacheable) {
      const cached = await this.statsCache.get<ActivityStatPoint[]>(
        input.userId,
        'activity',
        periodKey,
      )
      if (cached) return { points: cached }
    }

    const points = await this.trainingRepository.getActivityStats(input)

    if (cacheable) {
      await this.statsCache.set(input.userId, 'activity', periodKey, points)
    }

    return { points }
  }
}

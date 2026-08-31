import { UseCase } from '../../../../../common/core/use-case'
import { aggregateMuscleGroupRows } from '../../../../../common/core/muscle-groups'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { MuscleGroupStatPoint } from '../../../../training/core/types'
import { StatsCacheService } from '../../../../../shared/stats/stats-cache.service'

export interface GetMuscleGroupStatsInput {
  userId: string
  from: string
  to: string
}

export interface GetMuscleGroupStatsOutput {
  groups: MuscleGroupStatPoint[]
}

export class GetMuscleGroupStatsUseCase
  implements UseCase<GetMuscleGroupStatsInput, GetMuscleGroupStatsOutput>
{
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly statsCache: StatsCacheService,
  ) {}

  public async execute(input: GetMuscleGroupStatsInput): Promise<GetMuscleGroupStatsOutput> {
    const periodKey = this.statsCache.periodKey(input.from, input.to)
    const cacheable = this.statsCache.isPeriodCompleted(input.to)

    if (cacheable) {
      const cached = await this.statsCache.get<MuscleGroupStatPoint[]>(
        input.userId,
        'muscle-groups-v2',
        periodKey,
      )
      if (cached) return { groups: cached }
    }

    const rows = await this.trainingRepository.getMuscleGroupVolumeRows(input)
    const groups = aggregateMuscleGroupRows(rows)

    if (cacheable) {
      await this.statsCache.set(input.userId, 'muscle-groups-v2', periodKey, groups)
    }

    return { groups }
  }
}

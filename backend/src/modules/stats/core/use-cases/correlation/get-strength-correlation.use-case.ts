import { UseCase } from '../../../../../common/core/use-case'
import { BodyMeasurementTypeormRepository } from '../../../../body-measurement/infrastructure/body-measurement.typeorm-repository'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { StrengthCorrelationPoint } from '../../../../training/core/types'
import { StatsCacheService } from '../../../../../shared/stats/stats-cache.service'

export interface GetStrengthCorrelationInput {
  userId: string
  exerciseId: string
  from: string
  to: string
}

export interface GetStrengthCorrelationOutput {
  points: StrengthCorrelationPoint[]
}

function latestWeightByDay(
  items: Array<{ measuredAt: string; weight: number | null }>,
): Map<string, number> {
  const byDate = new Map<string, { measuredAt: string; weight: number }>()
  for (const item of items) {
    if (item.weight == null) continue
    const date = item.measuredAt.slice(0, 10)
    const current = byDate.get(date)
    if (!current || item.measuredAt.localeCompare(current.measuredAt) > 0) {
      byDate.set(date, { measuredAt: item.measuredAt, weight: item.weight })
    }
  }
  return new Map([...byDate.entries()].map(([date, item]) => [date, item.weight]))
}

function mergeCorrelation(
  progress: Array<{ date: string; maxWeight: number | null; bestVolume: number }>,
  weightByDay: Map<string, number>,
): StrengthCorrelationPoint[] {
  const dates = new Set<string>([
    ...progress.map((p) => p.date),
    ...weightByDay.keys(),
  ])

  const progressByDate = new Map(progress.map((p) => [p.date, p]))
  let lastWeight: number | null = null

  return [...dates]
    .sort()
    .map((date) => {
      const dayWeight = weightByDay.get(date)
      if (dayWeight != null) lastWeight = dayWeight
      const exercise = progressByDate.get(date)
      return {
        date,
        bodyWeight: lastWeight,
        maxWeight: exercise?.maxWeight ?? null,
        volume: exercise?.bestVolume ?? 0,
      }
    })
}

export class GetStrengthCorrelationUseCase
  implements UseCase<GetStrengthCorrelationInput, GetStrengthCorrelationOutput>
{
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly bodyMeasurements: BodyMeasurementTypeormRepository,
    private readonly statsCache: StatsCacheService,
  ) {}

  public async execute(input: GetStrengthCorrelationInput): Promise<GetStrengthCorrelationOutput> {
    const periodKey = `${input.exerciseId}:${this.statsCache.periodKey(input.from, input.to)}`
    const cacheable = this.statsCache.isPeriodCompleted(input.to)

    if (cacheable) {
      const cached = await this.statsCache.get<StrengthCorrelationPoint[]>(
        input.userId,
        'correlation',
        periodKey,
      )
      if (cached) return { points: cached }
    }

    const [progress, measurements] = await Promise.all([
      this.trainingRepository.getExerciseProgress(input),
      this.bodyMeasurements.list(input.userId, input.from, input.to),
    ])

    const weightByDay = latestWeightByDay(measurements)
    const points = mergeCorrelation(progress, weightByDay)

    if (cacheable) {
      await this.statsCache.set(input.userId, 'correlation', periodKey, points)
    }

    return { points }
  }
}

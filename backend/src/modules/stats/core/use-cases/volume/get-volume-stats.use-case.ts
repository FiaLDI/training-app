import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { VolumeStatPoint } from '../../../../training/core/types'

export interface GetVolumeStatsInput {
  userId: string
  from: string
  to: string
}

export interface GetVolumeStatsOutput {
  points: VolumeStatPoint[]
}

export class GetVolumeStatsUseCase implements UseCase<GetVolumeStatsInput, GetVolumeStatsOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: GetVolumeStatsInput): Promise<GetVolumeStatsOutput> {
    const points = await this.trainingRepository.getVolumeStats(input)
    return { points }
  }
}

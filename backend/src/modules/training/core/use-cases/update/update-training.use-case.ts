import { UseCase } from '../../../../../common/core/use-case'
import { StatsCacheService } from '../../../../../shared/stats/stats-cache.service'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { UpdateTrainingInput } from './interfaces/update-training.input'
import { UpdateTrainingOutput } from './interfaces/update-training.output'

export class UpdateTrainingUseCase implements UseCase<UpdateTrainingInput, UpdateTrainingOutput> {
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly statsCache?: StatsCacheService,
  ) {}

  public async execute(input: UpdateTrainingInput): Promise<UpdateTrainingOutput> {
    const patch = { ...input }

    if (
      (input.status === 'in_progress' && input.startedAt === undefined) ||
      (input.status === 'finished' && input.finishedAt === undefined)
    ) {
      const existing = await this.trainingRepository.getById(input.id, input.userId)
      if (input.status === 'in_progress' && existing && !existing.startedAt) {
        patch.startedAt = new Date().toISOString()
      }
      if (input.status === 'finished' && existing && !existing.finishedAt) {
        patch.finishedAt = new Date().toISOString()
      }
    }

    const training = await this.trainingRepository.update(patch)
    if (!training) return { training }

    if (input.status === 'in_progress') {
      await this.trainingRepository.fillMissingPreviousMaxWeights(input.id, input.userId)
    }
    if (input.status === 'finished') {
      await this.trainingRepository.snapshotSessionMaxWeights(input.id, input.userId)
      await this.statsCache?.invalidateUser(input.userId)
    }

    return { training }
  }
}

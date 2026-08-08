import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { UpdateTrainingInput } from './interfaces/update-training.input'
import { UpdateTrainingOutput } from './interfaces/update-training.output'

export class UpdateTrainingUseCase implements UseCase<UpdateTrainingInput, UpdateTrainingOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: UpdateTrainingInput): Promise<UpdateTrainingOutput> {
    const patch = { ...input }

    if (input.status === 'in_progress' && input.startedAt === undefined) {
      const existing = await this.trainingRepository.getById(input.id, input.userId)
      if (existing && !existing.startedAt) {
        patch.startedAt = new Date().toISOString()
      }
    }

    const training = await this.trainingRepository.update(patch)
    return { training }
  }
}

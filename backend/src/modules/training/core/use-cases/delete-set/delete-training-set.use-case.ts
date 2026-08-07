import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { DeleteTrainingSetInput } from './interfaces/delete-training-set.input'
import { DeleteTrainingSetOutput } from './interfaces/delete-training-set.output'

export class DeleteTrainingSetUseCase
  implements UseCase<DeleteTrainingSetInput, DeleteTrainingSetOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: DeleteTrainingSetInput): Promise<DeleteTrainingSetOutput> {
    const deleted = await this.trainingRepository.deleteSet(input.id, input.userId)
    return { deleted }
  }
}

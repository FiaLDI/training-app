import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { UpdateTrainingSetInput } from './interfaces/update-training-set.input'
import { UpdateTrainingSetOutput } from './interfaces/update-training-set.output'

export class UpdateTrainingSetUseCase
  implements UseCase<UpdateTrainingSetInput, UpdateTrainingSetOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: UpdateTrainingSetInput): Promise<UpdateTrainingSetOutput> {
    const set = await this.trainingRepository.updateSet(input)
    return { set }
  }
}

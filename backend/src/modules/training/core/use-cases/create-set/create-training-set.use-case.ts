import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingSetInput } from './interfaces/create-training-set.input'
import { CreateTrainingSetOutput } from './interfaces/create-training-set.output'

export class CreateTrainingSetUseCase
  implements UseCase<CreateTrainingSetInput, CreateTrainingSetOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: CreateTrainingSetInput): Promise<CreateTrainingSetOutput> {
    const set = await this.trainingRepository.createSet(input)
    return { set }
  }
}

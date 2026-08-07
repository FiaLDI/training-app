import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { GetTrainingInput } from './interfaces/get-training.input'
import { GetTrainingOutput } from './interfaces/get-training.output'

export class GetTrainingUseCase implements UseCase<GetTrainingInput, GetTrainingOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: GetTrainingInput): Promise<GetTrainingOutput> {
    const training = await this.trainingRepository.getById(input.id, input.userId)
    return { training }
  }
}

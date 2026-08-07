import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingInput } from './interfaces/create-training.input'
import { CreateTrainingOutput } from './interfaces/create-training.output'

export class CreateTrainingUseCase implements UseCase<CreateTrainingInput, CreateTrainingOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: CreateTrainingInput): Promise<CreateTrainingOutput> {
    const training = await this.trainingRepository.create(input)
    return { training }
  }
}

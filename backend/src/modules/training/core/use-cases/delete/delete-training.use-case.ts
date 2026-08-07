import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { DeleteTrainingInput } from './interfaces/delete-training.input'
import { DeleteTrainingOutput } from './interfaces/delete-training.output'

export class DeleteTrainingUseCase implements UseCase<DeleteTrainingInput, DeleteTrainingOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: DeleteTrainingInput): Promise<DeleteTrainingOutput> {
    const deleted = await this.trainingRepository.delete(input.id, input.userId)
    return { deleted }
  }
}

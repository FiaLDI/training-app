import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { ListTrainingsInput } from './interfaces/list-trainings.input'
import { ListTrainingsOutput } from './interfaces/list-trainings.output'

export class ListTrainingsUseCase implements UseCase<ListTrainingsInput, ListTrainingsOutput> {
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: ListTrainingsInput): Promise<ListTrainingsOutput> {
    return this.trainingRepository.list(input)
  }
}

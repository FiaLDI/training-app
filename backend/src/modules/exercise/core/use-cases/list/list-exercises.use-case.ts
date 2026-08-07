import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { ListExercisesInput } from './interfaces/list-exercises.input'
import { ListExercisesOutput } from './interfaces/list-exercises.output'

export class ListExercisesUseCase implements UseCase<ListExercisesInput, ListExercisesOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: ListExercisesInput): Promise<ListExercisesOutput> {
    return this.exerciseRepository.list(input)
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { GetExerciseInput } from './interfaces/get-exercise.input'
import { GetExerciseOutput } from './interfaces/get-exercise.output'

export class GetExerciseUseCase implements UseCase<GetExerciseInput, GetExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: GetExerciseInput): Promise<GetExerciseOutput> {
    const exercise = await this.exerciseRepository.getById(input.id)
    return { exercise }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { UpdateExerciseInput } from './interfaces/update-exercise.input'
import { UpdateExerciseOutput } from './interfaces/update-exercise.output'

export class UpdateExerciseUseCase implements UseCase<UpdateExerciseInput, UpdateExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: UpdateExerciseInput): Promise<UpdateExerciseOutput> {
    const exercise = await this.exerciseRepository.update(input)
    return { exercise }
  }
}

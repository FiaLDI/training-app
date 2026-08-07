import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../ports/exercise-repository.port'
import { DeleteExerciseInput } from './interfaces/delete-exercise.input'
import { DeleteExerciseOutput } from './interfaces/delete-exercise.output'

export class DeleteExerciseUseCase implements UseCase<DeleteExerciseInput, DeleteExerciseOutput> {
  constructor(private readonly exerciseRepository: ExerciseRepositoryPort) {}

  public async execute(input: DeleteExerciseInput): Promise<DeleteExerciseOutput> {
    const deleted = await this.exerciseRepository.delete(input.id)
    return { deleted }
  }
}

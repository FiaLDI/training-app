import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { DeleteTrainingExerciseInput } from './interfaces/delete-training-exercise.input'
import { DeleteTrainingExerciseOutput } from './interfaces/delete-training-exercise.output'

export class DeleteTrainingExerciseUseCase
  implements UseCase<DeleteTrainingExerciseInput, DeleteTrainingExerciseOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: DeleteTrainingExerciseInput): Promise<DeleteTrainingExerciseOutput> {
    const deleted = await this.trainingRepository.deleteExercise(input.id, input.userId)
    return { deleted }
  }
}

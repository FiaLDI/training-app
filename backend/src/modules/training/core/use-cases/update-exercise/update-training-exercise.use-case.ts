import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { UpdateTrainingExerciseInput } from './interfaces/update-training-exercise.input'
import { UpdateTrainingExerciseOutput } from './interfaces/update-training-exercise.output'

export class UpdateTrainingExerciseUseCase
  implements UseCase<UpdateTrainingExerciseInput, UpdateTrainingExerciseOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: UpdateTrainingExerciseInput): Promise<UpdateTrainingExerciseOutput> {
    const exercise = await this.trainingRepository.updateExercise(input)
    return { exercise }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingExerciseInput } from './interfaces/create-training-exercise.input'
import { CreateTrainingExerciseOutput } from './interfaces/create-training-exercise.output'

export class CreateTrainingExerciseUseCase
  implements UseCase<CreateTrainingExerciseInput, CreateTrainingExerciseOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(input: CreateTrainingExerciseInput): Promise<CreateTrainingExerciseOutput> {
    const exercise = await this.trainingRepository.createExercise(input)
    return { exercise }
  }
}

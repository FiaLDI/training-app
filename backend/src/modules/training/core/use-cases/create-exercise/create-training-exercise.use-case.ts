import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingExerciseInput } from './interfaces/create-training-exercise.input'
import { CreateTrainingExerciseOutput } from './interfaces/create-training-exercise.output'

export class CreateTrainingExerciseUseCase
  implements UseCase<CreateTrainingExerciseInput, CreateTrainingExerciseOutput>
{
  constructor(
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly exerciseRepository: ExerciseRepositoryPort,
  ) {}

  public async execute(input: CreateTrainingExerciseInput): Promise<CreateTrainingExerciseOutput> {
    const catalogExercise = await this.exerciseRepository.getById(input.exerciseId, input.userId)
    if (!catalogExercise) {
      throw new NotFoundException('Exercise not found')
    }

    const exercise = await this.trainingRepository.createExercise(input)
    return { exercise }
  }
}

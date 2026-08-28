import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { CreateTrainingExerciseGroupInput } from './interfaces/create-training-exercise-group.input'
import { CreateTrainingExerciseGroupOutput } from './interfaces/create-training-exercise-group.output'

export class CreateTrainingExerciseGroupUseCase
  implements UseCase<CreateTrainingExerciseGroupInput, CreateTrainingExerciseGroupOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(
    input: CreateTrainingExerciseGroupInput,
  ): Promise<CreateTrainingExerciseGroupOutput> {
    const training = await this.trainingRepository.getById(input.trainingId, input.userId)
    if (!training) {
      throw new BadRequestException('Training not found')
    }

    const exercises = training.exercises.filter((item) => input.exerciseIds.includes(item.id))
    if (exercises.length !== input.exerciseIds.length) {
      throw new BadRequestException('One or more exercises not found in training')
    }
    if (exercises.length < 2) {
      throw new BadRequestException('At least two exercises are required')
    }

    const groupOrder = Math.min(...exercises.map((item) => item.exerciseOrder))
    const group = await this.trainingRepository.createGroup({
      id: input.id,
      trainingId: input.trainingId,
      userId: input.userId,
      exerciseIds: input.exerciseIds,
      type: input.type,
      groupOrder,
      restSeconds: input.restSeconds,
    })

    if (!group) {
      throw new BadRequestException(
        'Cannot create group: exercises must be adjacent, ungrouped, and in order',
      )
    }
    return { group }
  }
}

import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { AddExerciseToTrainingGroupInput } from './interfaces/add-exercise-to-training-group.input'
import { AddExerciseToTrainingGroupOutput } from './interfaces/add-exercise-to-training-group.output'

export class AddExerciseToTrainingGroupUseCase
  implements UseCase<AddExerciseToTrainingGroupInput, AddExerciseToTrainingGroupOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(
    input: AddExerciseToTrainingGroupInput,
  ): Promise<AddExerciseToTrainingGroupOutput> {
    const group = await this.trainingRepository.addExerciseToGroup({
      groupId: input.groupId,
      exerciseId: input.exerciseId,
      userId: input.userId,
    })

    if (!group) {
      throw new BadRequestException(
        'Cannot add exercise: must be adjacent below the group and ungrouped',
      )
    }

    return { group }
  }
}

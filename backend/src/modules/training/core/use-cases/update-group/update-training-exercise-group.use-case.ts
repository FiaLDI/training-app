import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { UpdateTrainingExerciseGroupInput } from './interfaces/update-training-exercise-group.input'
import { UpdateTrainingExerciseGroupOutput } from './interfaces/update-training-exercise-group.output'

export class UpdateTrainingExerciseGroupUseCase
  implements UseCase<UpdateTrainingExerciseGroupInput, UpdateTrainingExerciseGroupOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(
    input: UpdateTrainingExerciseGroupInput,
  ): Promise<UpdateTrainingExerciseGroupOutput> {
    const group = await this.trainingRepository.updateGroup(input)
    if (!group) throw new NotFoundException('Training exercise group not found')
    return { group }
  }
}

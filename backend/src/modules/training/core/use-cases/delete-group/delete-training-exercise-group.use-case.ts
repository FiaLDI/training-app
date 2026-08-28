import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TrainingRepositoryPort } from '../../ports/training-repository.port'
import { DeleteTrainingExerciseGroupInput } from './interfaces/delete-training-exercise-group.input'
import { DeleteTrainingExerciseGroupOutput } from './interfaces/delete-training-exercise-group.output'

export class DeleteTrainingExerciseGroupUseCase
  implements UseCase<DeleteTrainingExerciseGroupInput, DeleteTrainingExerciseGroupOutput>
{
  constructor(private readonly trainingRepository: TrainingRepositoryPort) {}

  public async execute(
    input: DeleteTrainingExerciseGroupInput,
  ): Promise<DeleteTrainingExerciseGroupOutput> {
    const deleted = await this.trainingRepository.deleteGroup(input.id, input.userId)
    if (!deleted) throw new NotFoundException('Training exercise group not found')
    return { deleted: true }
  }
}

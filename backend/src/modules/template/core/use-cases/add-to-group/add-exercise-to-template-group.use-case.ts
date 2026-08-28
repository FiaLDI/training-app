import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { AddExerciseToTemplateGroupInput } from './interfaces/add-exercise-to-template-group.input'
import { AddExerciseToTemplateGroupOutput } from './interfaces/add-exercise-to-template-group.output'

export class AddExerciseToTemplateGroupUseCase
  implements UseCase<AddExerciseToTemplateGroupInput, AddExerciseToTemplateGroupOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(
    input: AddExerciseToTemplateGroupInput,
  ): Promise<AddExerciseToTemplateGroupOutput> {
    const group = await this.templateRepository.addExerciseToGroup({
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

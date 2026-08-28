import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { UpdateTemplateExerciseGroupInput } from './interfaces/update-template-exercise-group.input'
import { UpdateTemplateExerciseGroupOutput } from './interfaces/update-template-exercise-group.output'

export class UpdateTemplateExerciseGroupUseCase
  implements UseCase<UpdateTemplateExerciseGroupInput, UpdateTemplateExerciseGroupOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(
    input: UpdateTemplateExerciseGroupInput,
  ): Promise<UpdateTemplateExerciseGroupOutput> {
    const group = await this.templateRepository.updateGroup(input)
    if (!group) throw new NotFoundException('Template exercise group not found')
    return { group }
  }
}

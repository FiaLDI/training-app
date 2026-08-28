import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { DeleteTemplateExerciseGroupInput } from './interfaces/delete-template-exercise-group.input'
import { DeleteTemplateExerciseGroupOutput } from './interfaces/delete-template-exercise-group.output'

export class DeleteTemplateExerciseGroupUseCase
  implements UseCase<DeleteTemplateExerciseGroupInput, DeleteTemplateExerciseGroupOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(
    input: DeleteTemplateExerciseGroupInput,
  ): Promise<DeleteTemplateExerciseGroupOutput> {
    const deleted = await this.templateRepository.deleteGroup(input.id, input.userId)
    if (!deleted) throw new NotFoundException('Template exercise group not found')
    return { deleted: true }
  }
}

import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { CreateTemplateExerciseGroupInput } from './interfaces/create-template-exercise-group.input'
import { CreateTemplateExerciseGroupOutput } from './interfaces/create-template-exercise-group.output'

export class CreateTemplateExerciseGroupUseCase
  implements UseCase<CreateTemplateExerciseGroupInput, CreateTemplateExerciseGroupOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(
    input: CreateTemplateExerciseGroupInput,
  ): Promise<CreateTemplateExerciseGroupOutput> {
    const template = await this.templateRepository.getById(input.templateId, input.userId)
    if (!template) {
      throw new BadRequestException('Template not found')
    }

    const exercises = template.exercises.filter((item) => input.exerciseIds.includes(item.id))
    if (exercises.length !== input.exerciseIds.length) {
      throw new BadRequestException('One or more exercises not found in template')
    }
    if (exercises.length < 2) {
      throw new BadRequestException('At least two exercises are required')
    }

    const groupOrder = Math.min(...exercises.map((item) => item.exerciseOrder))
    const group = await this.templateRepository.createGroup({
      id: input.id,
      templateId: input.templateId,
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

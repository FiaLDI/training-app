import { BadRequestException, NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../../../template/core/ports/template-repository.port'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { CreateProgramDayInput } from './interfaces/create-program-day.input'
import { CreateProgramDayOutput } from './interfaces/create-program-day.output'

export class CreateProgramDayUseCase
  implements UseCase<CreateProgramDayInput, CreateProgramDayOutput>
{
  constructor(
    private readonly programRepository: ProgramRepositoryPort,
    private readonly templateRepository: TemplateRepositoryPort,
  ) {}

  public async execute(input: CreateProgramDayInput): Promise<CreateProgramDayOutput> {
    if (input.templateId) {
      const template = await this.templateRepository.getById(input.templateId, input.userId)
      if (!template) {
        throw new NotFoundException('Template not found')
      }
    }

    const day = await this.programRepository.createDay(input)
    if (!day) {
      throw new BadRequestException('Failed to create program day')
    }
    return { day }
  }
}

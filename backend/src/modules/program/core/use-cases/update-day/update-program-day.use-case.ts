import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../../../template/core/ports/template-repository.port'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { UpdateProgramDayInput } from './interfaces/update-program-day.input'
import { UpdateProgramDayOutput } from './interfaces/update-program-day.output'

export class UpdateProgramDayUseCase
  implements UseCase<UpdateProgramDayInput, UpdateProgramDayOutput>
{
  constructor(
    private readonly programRepository: ProgramRepositoryPort,
    private readonly templateRepository: TemplateRepositoryPort,
  ) {}

  public async execute(input: UpdateProgramDayInput): Promise<UpdateProgramDayOutput> {
    if (input.templateId) {
      const template = await this.templateRepository.getById(input.templateId, input.userId)
      if (!template) {
        throw new NotFoundException('Template not found')
      }
    }

    const day = await this.programRepository.updateDay(input)
    return { day }
  }
}

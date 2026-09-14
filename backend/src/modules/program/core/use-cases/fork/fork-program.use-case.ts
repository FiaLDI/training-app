import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { ForkProgramInput } from './interfaces/fork-program.input'
import { ForkProgramOutput } from './interfaces/fork-program.output'

export class ForkProgramUseCase implements UseCase<ForkProgramInput, ForkProgramOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: ForkProgramInput): Promise<ForkProgramOutput> {
    const source = await this.programRepository.getById(input.id, input.userId)
    if (!source) {
      throw new NotFoundException('Program not found')
    }

    if (!source.isSystem && source.userId === input.userId) {
      return { program: source }
    }

    const existing = await this.programRepository.findUserFork(input.userId, source.id)
    if (existing) {
      return { program: existing }
    }

    const copy = await this.programRepository.create({
      userId: input.userId,
      name: source.name,
      description: source.description,
      metadata: {
        ...source.metadata,
        forkedFrom: source.id,
      },
    })

    for (const day of source.days) {
      await this.programRepository.createDay({
        programId: copy.id,
        userId: input.userId,
        dayOfWeek: day.dayOfWeek,
        slotOrder: day.slotOrder,
        templateId: day.templateId,
        notes: day.notes,
      })
    }

    const program = await this.programRepository.getById(copy.id, input.userId)
    return { program: program ?? { ...copy, days: [] } }
  }
}

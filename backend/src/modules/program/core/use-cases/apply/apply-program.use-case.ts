import { BadRequestException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../../../template/core/ports/template-repository.port'
import { copyTemplateStructureToTraining } from '../../../../training/core/lib/copy-template-structure'
import { TrainingRepositoryPort } from '../../../../training/core/ports/training-repository.port'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { ApplyProgramInput } from './interfaces/apply-program.input'
import { ApplyProgramOutput } from './interfaces/apply-program.output'

function parseWeekStart(weekStart: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStart)
  if (!match) {
    throw new BadRequestException('weekStart must be YYYY-MM-DD (Monday)')
  }
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0))
  if (date.getUTCDay() !== 1) {
    throw new BadRequestException('weekStart must be a Monday')
  }
  return date
}

function scheduledAtForDay(weekStart: Date, dayOfWeek: number): string {
  const date = new Date(weekStart)
  date.setUTCDate(date.getUTCDate() + (dayOfWeek - 1))
  return date.toISOString()
}

export class ApplyProgramUseCase implements UseCase<ApplyProgramInput, ApplyProgramOutput> {
  constructor(
    private readonly programRepository: ProgramRepositoryPort,
    private readonly trainingRepository: TrainingRepositoryPort,
    private readonly templateRepository: TemplateRepositoryPort,
  ) {}

  public async execute(input: ApplyProgramInput): Promise<ApplyProgramOutput> {
    const program = await this.programRepository.getById(input.id, input.userId)
    if (!program) {
      throw new BadRequestException('Program not found')
    }

    const weekStart = parseWeekStart(input.weekStart)
    const created = []
    let skipped = 0

    for (const day of program.days) {
      if (!day.templateId) continue

      const scheduledAt = scheduledAtForDay(weekStart, day.dayOfWeek)
      const existingByProgramDay = await this.trainingRepository.findActiveByProgramDay(
        input.userId,
        day.id,
        scheduledAt,
      )
      if (existingByProgramDay) {
        skipped += 1
        continue
      }

      const existingOnDate = await this.trainingRepository.findActiveOnScheduledDate(
        input.userId,
        scheduledAt,
      )
      if (existingOnDate) {
        skipped += 1
        continue
      }

      const training = await this.trainingRepository.create({
        userId: input.userId,
        templateId: day.templateId,
        programId: program.id,
        programDayId: day.id,
        status: 'planned',
        scheduledAt,
        startedAt: null,
        notes: day.notes,
      })

      const template = await this.templateRepository.getById(day.templateId, input.userId)
      if (template) {
        await copyTemplateStructureToTraining(
          template,
          training.id,
          input.userId,
          this.trainingRepository,
        )
      }

      created.push(training)
    }

    return { created, skipped }
  }
}

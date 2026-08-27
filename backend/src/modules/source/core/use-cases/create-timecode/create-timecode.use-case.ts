import { NotFoundException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { CreateTimecodeInput } from './interfaces/create-timecode.input'
import { CreateTimecodeOutput } from './interfaces/create-timecode.output'

export class CreateTimecodeUseCase implements UseCase<CreateTimecodeInput, CreateTimecodeOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: CreateTimecodeInput): Promise<CreateTimecodeOutput> {
    const owned = await this.access.requireEditableSource(input.sourceId, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) {
      throw new NotFoundException('Source not found')
    }

    const timecode = await this.sourceRepository.createTimecode({
      sourceId: input.sourceId,
      seconds: input.seconds,
      title: input.title,
      metadata: input.metadata,
    })
    return { timecode }
  }
}

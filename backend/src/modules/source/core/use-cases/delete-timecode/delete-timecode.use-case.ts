import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { DeleteTimecodeInput } from './interfaces/delete-timecode.input'
import { DeleteTimecodeOutput } from './interfaces/delete-timecode.output'

export class DeleteTimecodeUseCase implements UseCase<DeleteTimecodeInput, DeleteTimecodeOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: DeleteTimecodeInput): Promise<DeleteTimecodeOutput> {
    const timecode = await this.sourceRepository.getTimecodeById(input.id)
    if (!timecode) return { deleted: false }

    const owned = await this.access.requireEditableSource(timecode.sourceId, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) return { deleted: false }

    const deleted = await this.sourceRepository.deleteTimecode(input.id)
    return { deleted }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { UpdateTimecodeInput } from './interfaces/update-timecode.input'
import { UpdateTimecodeOutput } from './interfaces/update-timecode.output'

export class UpdateTimecodeUseCase implements UseCase<UpdateTimecodeInput, UpdateTimecodeOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: UpdateTimecodeInput): Promise<UpdateTimecodeOutput> {
    const timecode = await this.sourceRepository.getTimecodeById(input.id)
    if (!timecode) return { timecode: null }

    const owned = await this.access.requireEditableSource(timecode.sourceId, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) return { timecode: null }

    const updated = await this.sourceRepository.updateTimecode({
      id: input.id,
      seconds: input.seconds,
      title: input.title,
      metadata: input.metadata,
    })
    return { timecode: updated }
  }
}

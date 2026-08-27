import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { UpdateSourceInput } from './interfaces/update-source.input'
import { UpdateSourceOutput } from './interfaces/update-source.output'

export class UpdateSourceUseCase implements UseCase<UpdateSourceInput, UpdateSourceOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: UpdateSourceInput): Promise<UpdateSourceOutput> {
    const owned = await this.access.requireEditableSource(input.id, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) return { source: null }

    const source = await this.sourceRepository.update({
      id: input.id,
      type: input.type,
      title: input.title,
      url: input.url,
      metadata: input.metadata,
    })
    return { source }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { DeleteSourceInput } from './interfaces/delete-source.input'
import { DeleteSourceOutput } from './interfaces/delete-source.output'

export class DeleteSourceUseCase implements UseCase<DeleteSourceInput, DeleteSourceOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: DeleteSourceInput): Promise<DeleteSourceOutput> {
    const owned = await this.access.requireEditableSource(input.id, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) return { deleted: false }

    const deleted = await this.sourceRepository.delete(input.id)
    return { deleted }
  }
}

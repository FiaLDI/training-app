import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { ListTimecodesInput } from './interfaces/list-timecodes.input'
import { ListTimecodesOutput } from './interfaces/list-timecodes.output'

export class ListTimecodesUseCase implements UseCase<ListTimecodesInput, ListTimecodesOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: ListTimecodesInput): Promise<ListTimecodesOutput> {
    const owned = await this.access.requireVisibleSource(input.sourceId, {
      id: input.userId,
      role: input.role,
    })
    if (!owned) return { items: [] }

    const items = await this.sourceRepository.listTimecodes(input.sourceId)
    return { items }
  }
}

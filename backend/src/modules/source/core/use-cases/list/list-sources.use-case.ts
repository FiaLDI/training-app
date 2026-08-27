import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { ListSourcesInput } from './interfaces/list-sources.input'
import { ListSourcesOutput } from './interfaces/list-sources.output'

export class ListSourcesUseCase implements UseCase<ListSourcesInput, ListSourcesOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
    this.sourceRepository = sourceRepository
  }

  private readonly sourceRepository: SourceRepositoryPort

  public async execute(input: ListSourcesInput): Promise<ListSourcesOutput> {
    if (input.exerciseId) {
      await this.access.requireVisibleExercise(input.exerciseId, {
        id: input.userId,
        role: input.role,
      })
    }

    return this.sourceRepository.list({
      viewerUserId: input.userId,
      page: input.page,
      limit: input.limit,
      exerciseId: input.exerciseId,
    })
  }
}

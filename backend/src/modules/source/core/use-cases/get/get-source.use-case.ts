import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { GetSourceInput } from './interfaces/get-source.input'
import { GetSourceOutput } from './interfaces/get-source.output'

export class GetSourceUseCase implements UseCase<GetSourceInput, GetSourceOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: GetSourceInput): Promise<GetSourceOutput> {
    const result = await this.access.requireVisibleSource(input.id, {
      id: input.userId,
      role: input.role,
    })
    return { source: result?.source ?? null }
  }
}

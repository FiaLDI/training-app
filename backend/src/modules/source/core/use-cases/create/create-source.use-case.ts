import { UseCase } from '../../../../../common/core/use-case'
import { ExerciseRepositoryPort } from '../../../../exercise/core/ports/exercise-repository.port'
import { SourceExerciseAccess } from '../../lib/source-exercise-access'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { CreateSourceInput } from './interfaces/create-source.input'
import { CreateSourceOutput } from './interfaces/create-source.output'

export class CreateSourceUseCase implements UseCase<CreateSourceInput, CreateSourceOutput> {
  private readonly access: SourceExerciseAccess

  constructor(
    private readonly sourceRepository: SourceRepositoryPort,
    exerciseRepository: ExerciseRepositoryPort,
  ) {
    this.access = new SourceExerciseAccess(sourceRepository, exerciseRepository)
  }

  public async execute(input: CreateSourceInput): Promise<CreateSourceOutput> {
    await this.access.requireEditableExercise(input.exerciseId, {
      id: input.userId,
      role: input.role,
    })

    const source = await this.sourceRepository.create({
      exerciseId: input.exerciseId,
      type: input.type,
      title: input.title,
      url: input.url,
      metadata: input.metadata,
    })
    return { source }
  }
}

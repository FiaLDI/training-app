import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { DeleteTemplateExerciseInput } from './interfaces/delete-template-exercise.input'
import { DeleteTemplateExerciseOutput } from './interfaces/delete-template-exercise.output'

export class DeleteTemplateExerciseUseCase
  implements UseCase<DeleteTemplateExerciseInput, DeleteTemplateExerciseOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: DeleteTemplateExerciseInput): Promise<DeleteTemplateExerciseOutput> {
    const deleted = await this.templateRepository.deleteExercise(input.id, input.userId)
    return { deleted }
  }
}

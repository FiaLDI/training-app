import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { UpdateTemplateExerciseInput } from './interfaces/update-template-exercise.input'
import { UpdateTemplateExerciseOutput } from './interfaces/update-template-exercise.output'

export class UpdateTemplateExerciseUseCase
  implements UseCase<UpdateTemplateExerciseInput, UpdateTemplateExerciseOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: UpdateTemplateExerciseInput): Promise<UpdateTemplateExerciseOutput> {
    const exercise = await this.templateRepository.updateExercise(input)
    return { exercise }
  }
}

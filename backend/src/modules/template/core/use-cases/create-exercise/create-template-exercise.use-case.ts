import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { CreateTemplateExerciseInput } from './interfaces/create-template-exercise.input'
import { CreateTemplateExerciseOutput } from './interfaces/create-template-exercise.output'

export class CreateTemplateExerciseUseCase
  implements UseCase<CreateTemplateExerciseInput, CreateTemplateExerciseOutput>
{
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: CreateTemplateExerciseInput): Promise<CreateTemplateExerciseOutput> {
    const exercise = await this.templateRepository.createExercise(input)
    return { exercise }
  }
}

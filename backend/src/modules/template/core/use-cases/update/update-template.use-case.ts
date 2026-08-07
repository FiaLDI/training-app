import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { UpdateTemplateInput } from './interfaces/update-template.input'
import { UpdateTemplateOutput } from './interfaces/update-template.output'

export class UpdateTemplateUseCase implements UseCase<UpdateTemplateInput, UpdateTemplateOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: UpdateTemplateInput): Promise<UpdateTemplateOutput> {
    const template = await this.templateRepository.update(input)
    return { template }
  }
}

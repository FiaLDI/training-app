import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { CreateTemplateInput } from './interfaces/create-template.input'
import { CreateTemplateOutput } from './interfaces/create-template.output'

export class CreateTemplateUseCase implements UseCase<CreateTemplateInput, CreateTemplateOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
    const template = await this.templateRepository.create(input)
    return { template }
  }
}

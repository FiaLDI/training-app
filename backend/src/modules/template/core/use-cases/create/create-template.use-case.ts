import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { CreateTemplateInput } from './interfaces/create-template.input'
import { CreateTemplateOutput } from './interfaces/create-template.output'

export class CreateTemplateUseCase implements UseCase<CreateTemplateInput, CreateTemplateOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: CreateTemplateInput): Promise<CreateTemplateOutput> {
    if (input.id) {
      const existing = await this.templateRepository.getById(input.id, input.userId)
      if (existing) return { template: existing }
    }
    const template = await this.templateRepository.create(input)
    return { template }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { GetTemplateInput } from './interfaces/get-template.input'
import { GetTemplateOutput } from './interfaces/get-template.output'

export class GetTemplateUseCase implements UseCase<GetTemplateInput, GetTemplateOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: GetTemplateInput): Promise<GetTemplateOutput> {
    const template = await this.templateRepository.getById(input.id, input.userId)
    return { template }
  }
}

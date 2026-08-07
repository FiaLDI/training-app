import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { ListTemplatesInput } from './interfaces/list-templates.input'
import { ListTemplatesOutput } from './interfaces/list-templates.output'

export class ListTemplatesUseCase implements UseCase<ListTemplatesInput, ListTemplatesOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: ListTemplatesInput): Promise<ListTemplatesOutput> {
    return this.templateRepository.list(input)
  }
}

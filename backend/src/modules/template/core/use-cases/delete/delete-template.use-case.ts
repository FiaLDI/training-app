import { UseCase } from '../../../../../common/core/use-case'
import { TemplateRepositoryPort } from '../../ports/template-repository.port'
import { DeleteTemplateInput } from './interfaces/delete-template.input'
import { DeleteTemplateOutput } from './interfaces/delete-template.output'

export class DeleteTemplateUseCase implements UseCase<DeleteTemplateInput, DeleteTemplateOutput> {
  constructor(private readonly templateRepository: TemplateRepositoryPort) {}

  public async execute(input: DeleteTemplateInput): Promise<DeleteTemplateOutput> {
    const deleted = await this.templateRepository.delete(input.id, input.userId)
    return { deleted }
  }
}

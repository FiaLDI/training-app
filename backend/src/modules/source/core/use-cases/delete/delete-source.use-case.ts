import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { DeleteSourceInput } from './interfaces/delete-source.input'
import { DeleteSourceOutput } from './interfaces/delete-source.output'

export class DeleteSourceUseCase implements UseCase<DeleteSourceInput, DeleteSourceOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: DeleteSourceInput): Promise<DeleteSourceOutput> {
    const deleted = await this.sourceRepository.delete(input.id)
    return { deleted }
  }
}

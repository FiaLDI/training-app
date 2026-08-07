import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { ListSourcesInput } from './interfaces/list-sources.input'
import { ListSourcesOutput } from './interfaces/list-sources.output'

export class ListSourcesUseCase implements UseCase<ListSourcesInput, ListSourcesOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: ListSourcesInput): Promise<ListSourcesOutput> {
    return this.sourceRepository.list(input)
  }
}

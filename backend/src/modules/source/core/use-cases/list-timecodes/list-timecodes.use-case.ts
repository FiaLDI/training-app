import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { ListTimecodesInput } from './interfaces/list-timecodes.input'
import { ListTimecodesOutput } from './interfaces/list-timecodes.output'

export class ListTimecodesUseCase implements UseCase<ListTimecodesInput, ListTimecodesOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: ListTimecodesInput): Promise<ListTimecodesOutput> {
    const items = await this.sourceRepository.listTimecodes(input.sourceId)
    return { items }
  }
}

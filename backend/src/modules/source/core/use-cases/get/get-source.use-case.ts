import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { GetSourceInput } from './interfaces/get-source.input'
import { GetSourceOutput } from './interfaces/get-source.output'

export class GetSourceUseCase implements UseCase<GetSourceInput, GetSourceOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: GetSourceInput): Promise<GetSourceOutput> {
    const source = await this.sourceRepository.getById(input.id)
    return { source }
  }
}

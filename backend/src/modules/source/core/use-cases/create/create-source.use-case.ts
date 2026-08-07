import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { CreateSourceInput } from './interfaces/create-source.input'
import { CreateSourceOutput } from './interfaces/create-source.output'

export class CreateSourceUseCase implements UseCase<CreateSourceInput, CreateSourceOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: CreateSourceInput): Promise<CreateSourceOutput> {
    const source = await this.sourceRepository.create(input)
    return { source }
  }
}

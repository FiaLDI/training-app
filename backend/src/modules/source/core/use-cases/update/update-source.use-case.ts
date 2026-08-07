import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { UpdateSourceInput } from './interfaces/update-source.input'
import { UpdateSourceOutput } from './interfaces/update-source.output'

export class UpdateSourceUseCase implements UseCase<UpdateSourceInput, UpdateSourceOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: UpdateSourceInput): Promise<UpdateSourceOutput> {
    const source = await this.sourceRepository.update(input)
    return { source }
  }
}

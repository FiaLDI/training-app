import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { CreateTimecodeInput } from './interfaces/create-timecode.input'
import { CreateTimecodeOutput } from './interfaces/create-timecode.output'

export class CreateTimecodeUseCase implements UseCase<CreateTimecodeInput, CreateTimecodeOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: CreateTimecodeInput): Promise<CreateTimecodeOutput> {
    const timecode = await this.sourceRepository.createTimecode(input)
    return { timecode }
  }
}

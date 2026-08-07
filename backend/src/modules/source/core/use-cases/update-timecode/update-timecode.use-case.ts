import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { UpdateTimecodeInput } from './interfaces/update-timecode.input'
import { UpdateTimecodeOutput } from './interfaces/update-timecode.output'

export class UpdateTimecodeUseCase implements UseCase<UpdateTimecodeInput, UpdateTimecodeOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: UpdateTimecodeInput): Promise<UpdateTimecodeOutput> {
    const timecode = await this.sourceRepository.updateTimecode(input)
    return { timecode }
  }
}

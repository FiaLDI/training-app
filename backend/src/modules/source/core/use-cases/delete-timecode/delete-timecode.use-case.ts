import { UseCase } from '../../../../../common/core/use-case'
import { SourceRepositoryPort } from '../../ports/source-repository.port'
import { DeleteTimecodeInput } from './interfaces/delete-timecode.input'
import { DeleteTimecodeOutput } from './interfaces/delete-timecode.output'

export class DeleteTimecodeUseCase implements UseCase<DeleteTimecodeInput, DeleteTimecodeOutput> {
  constructor(private readonly sourceRepository: SourceRepositoryPort) {}

  public async execute(input: DeleteTimecodeInput): Promise<DeleteTimecodeOutput> {
    const deleted = await this.sourceRepository.deleteTimecode(input.id)
    return { deleted }
  }
}

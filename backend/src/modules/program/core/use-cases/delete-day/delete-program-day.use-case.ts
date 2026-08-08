import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { DeleteProgramDayInput } from './interfaces/delete-program-day.input'
import { DeleteProgramDayOutput } from './interfaces/delete-program-day.output'

export class DeleteProgramDayUseCase
  implements UseCase<DeleteProgramDayInput, DeleteProgramDayOutput>
{
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: DeleteProgramDayInput): Promise<DeleteProgramDayOutput> {
    const deleted = await this.programRepository.deleteDay(input.id, input.userId)
    return { deleted }
  }
}

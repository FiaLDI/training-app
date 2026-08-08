import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { UpdateProgramDayInput } from './interfaces/update-program-day.input'
import { UpdateProgramDayOutput } from './interfaces/update-program-day.output'

export class UpdateProgramDayUseCase
  implements UseCase<UpdateProgramDayInput, UpdateProgramDayOutput>
{
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: UpdateProgramDayInput): Promise<UpdateProgramDayOutput> {
    const day = await this.programRepository.updateDay(input)
    return { day }
  }
}

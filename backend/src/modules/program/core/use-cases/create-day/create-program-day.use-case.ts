import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { CreateProgramDayInput } from './interfaces/create-program-day.input'
import { CreateProgramDayOutput } from './interfaces/create-program-day.output'

export class CreateProgramDayUseCase
  implements UseCase<CreateProgramDayInput, CreateProgramDayOutput>
{
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: CreateProgramDayInput): Promise<CreateProgramDayOutput> {
    const day = await this.programRepository.createDay(input)
    return { day }
  }
}

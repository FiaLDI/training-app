import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { GetProgramInput } from './interfaces/get-program.input'
import { GetProgramOutput } from './interfaces/get-program.output'

export class GetProgramUseCase implements UseCase<GetProgramInput, GetProgramOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: GetProgramInput): Promise<GetProgramOutput> {
    const program = await this.programRepository.getById(input.id, input.userId)
    return { program }
  }
}

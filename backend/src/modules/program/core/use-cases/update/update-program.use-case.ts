import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { UpdateProgramInput } from './interfaces/update-program.input'
import { UpdateProgramOutput } from './interfaces/update-program.output'

export class UpdateProgramUseCase implements UseCase<UpdateProgramInput, UpdateProgramOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: UpdateProgramInput): Promise<UpdateProgramOutput> {
    const program = await this.programRepository.update(input)
    return { program }
  }
}

import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { CreateProgramInput } from './interfaces/create-program.input'
import { CreateProgramOutput } from './interfaces/create-program.output'

export class CreateProgramUseCase implements UseCase<CreateProgramInput, CreateProgramOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: CreateProgramInput): Promise<CreateProgramOutput> {
    const program = await this.programRepository.create(input)
    return { program }
  }
}

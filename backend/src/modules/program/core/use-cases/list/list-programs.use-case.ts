import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { ListProgramsInput } from './interfaces/list-programs.input'
import { ListProgramsOutput } from './interfaces/list-programs.output'

export class ListProgramsUseCase implements UseCase<ListProgramsInput, ListProgramsOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: ListProgramsInput): Promise<ListProgramsOutput> {
    return this.programRepository.list(input)
  }
}

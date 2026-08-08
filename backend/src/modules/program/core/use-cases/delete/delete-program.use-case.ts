import { UseCase } from '../../../../../common/core/use-case'
import { ProgramRepositoryPort } from '../../ports/program-repository.port'
import { DeleteProgramInput } from './interfaces/delete-program.input'
import { DeleteProgramOutput } from './interfaces/delete-program.output'

export class DeleteProgramUseCase implements UseCase<DeleteProgramInput, DeleteProgramOutput> {
  constructor(private readonly programRepository: ProgramRepositoryPort) {}

  public async execute(input: DeleteProgramInput): Promise<DeleteProgramOutput> {
    const deleted = await this.programRepository.delete(input.id, input.userId)
    return { deleted }
  }
}

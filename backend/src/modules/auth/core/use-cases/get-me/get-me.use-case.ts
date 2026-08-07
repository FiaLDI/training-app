import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { GetMeInput } from './interfaces/get-me.input'
import { GetMeOutput } from './interfaces/get-me.output'

export class GetMeUseCase implements UseCase<GetMeInput, GetMeOutput> {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  public async execute(input: GetMeInput): Promise<GetMeOutput> {
    const user = await this.authRepository.findUserById(input.userId)
    return { user }
  }
}

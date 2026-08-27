import { UseCase } from '../../../../../common/core/use-case'
import { AuthRepositoryPort } from '../../ports/auth-repository.port'
import { User } from '../../types'

export type ListUsersOutput = {
  users: Array<
    Pick<User, 'id' | 'email' | 'username' | 'role' | 'createdAt' | 'lastLoginAt'>
  >
}

export class ListUsersUseCase implements UseCase<void, ListUsersOutput> {
  constructor(private readonly authRepository: AuthRepositoryPort) {}

  public async execute(): Promise<ListUsersOutput> {
    const users = await this.authRepository.listUsers()
    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
    }
  }
}

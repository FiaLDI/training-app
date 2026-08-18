import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  AuthRepositoryPort,
  CreateUserRepositoryInput,
} from '../core/ports/auth-repository.port'
import { User } from '../core/types'
import { UserEntity } from '../core/entity/user.entity'

@Injectable()
export class AuthTypeormRepository implements AuthRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  private mapUser(entity: UserEntity): User {
    return {
      id: entity.id,
      email: entity.email,
      username: entity.username,
      loginCode: entity.loginCode,
      role: entity.role === 'admin' ? 'admin' : 'user',
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const entity = await this.users.findOne({
      where: { email: email.toLowerCase() },
    })
    return entity ? this.mapUser(entity) : null
  }

  async findUserById(id: string): Promise<User | null> {
    const entity = await this.users.findOne({ where: { id } })
    return entity ? this.mapUser(entity) : null
  }

  async findUserByLoginCode(loginCode: string): Promise<User | null> {
    const entity = await this.users.findOne({
      where: { loginCode },
    })
    return entity ? this.mapUser(entity) : null
  }

  async createUser(input: CreateUserRepositoryInput): Promise<User> {
    const entity = this.users.create({
      email: input.email.toLowerCase(),
      username: input.username,
      loginCode: input.loginCode,
      metadata: input.metadata ?? {},
    })
    return this.mapUser(await this.users.save(entity))
  }
}

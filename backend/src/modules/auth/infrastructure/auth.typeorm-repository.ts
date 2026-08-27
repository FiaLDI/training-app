import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  AuthRepositoryPort,
  CreateUserRepositoryInput,
} from '../core/ports/auth-repository.port'
import { User, UserWithCredentials } from '../core/types'
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
      role: entity.role === 'admin' ? 'admin' : 'user',
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      lastLoginAt: entity.lastLoginAt ? entity.lastLoginAt.toISOString() : null,
      sessionsRevokedAt: entity.sessionsRevokedAt
        ? entity.sessionsRevokedAt.toISOString()
        : null,
    }
  }

  private mapWithCredentials(entity: UserEntity): UserWithCredentials {
    return {
      ...this.mapUser(entity),
      loginCodeHash: entity.loginCodeHash,
      loginCodeLookup: entity.loginCodeLookup,
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

  async findUserWithCredentialsByLookup(
    lookup: string,
  ): Promise<UserWithCredentials | null> {
    const entity = await this.users.findOne({
      where: { loginCodeLookup: lookup },
    })
    return entity ? this.mapWithCredentials(entity) : null
  }

  async findUserWithCredentialsById(id: string): Promise<UserWithCredentials | null> {
    const entity = await this.users.findOne({ where: { id } })
    return entity ? this.mapWithCredentials(entity) : null
  }

  async createUser(input: CreateUserRepositoryInput): Promise<User> {
    const entity = this.users.create({
      email: input.email.toLowerCase(),
      username: input.username,
      loginCodeHash: input.loginCodeHash,
      loginCodeLookup: input.loginCodeLookup,
      metadata: input.metadata ?? {},
      role: input.role ?? 'user',
    })
    return this.mapUser(await this.users.save(entity))
  }

  async updateLoginCode(
    userId: string,
    input: { loginCodeHash: string; loginCodeLookup: string },
  ): Promise<void> {
    await this.users.update(
      { id: userId },
      {
        loginCodeHash: input.loginCodeHash,
        loginCodeLookup: input.loginCodeLookup,
      },
    )
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { lastLoginAt: new Date() })
  }

  async revokeSessionsAt(userId: string, at: Date): Promise<void> {
    await this.users.update({ id: userId }, { sessionsRevokedAt: at })
  }

  async listUsers(): Promise<User[]> {
    const entities = await this.users.find({
      order: { createdAt: 'DESC' },
    })
    return entities.map((entity) => this.mapUser(entity))
  }

  async isLoginLookupTaken(lookup: string, exceptUserId?: string): Promise<boolean> {
    const existing = await this.users.findOne({
      where: { loginCodeLookup: lookup },
    })
    if (!existing) return false
    return exceptUserId ? existing.id !== exceptUserId : true
  }
}

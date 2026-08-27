import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  CreateExerciseRepositoryInput,
  ExerciseRepositoryPort,
  ListExercisesRepositoryInput,
  ListExercisesRepositoryOutput,
  UpdateExerciseRepositoryInput,
} from '../core/ports/exercise-repository.port'
import { Exercise } from '../core/types'
import { ExerciseEntity } from '../core/entity/exercise.entity'

@Injectable()
export class ExerciseTypeormRepository implements ExerciseRepositoryPort {
  constructor(
    @InjectRepository(ExerciseEntity)
    private readonly exercises: Repository<ExerciseEntity>,
  ) {}

  private mapToDomain(entity: ExerciseEntity): Exercise {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      muscleGroup: entity.muscleGroup,
      difficulty: entity.difficulty,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  private visibilityWhere(alias: string): string {
    return `(${alias}.user_id IS NULL OR ${alias}.user_id = :viewerUserId)`
  }

  async list(input: ListExercisesRepositoryInput): Promise<ListExercisesRepositoryOutput> {
    const qb = this.exercises
      .createQueryBuilder('e')
      .where(this.visibilityWhere('e'), { viewerUserId: input.userId })
      .orderBy('e.created_at', 'DESC')
      .skip((input.page - 1) * input.limit)
      .take(input.limit)

    if (input.q) {
      qb.andWhere('e.name ILIKE :q', { q: `%${input.q}%` })
    }

    const [items, total] = await qb.getManyAndCount()

    return {
      items: items.map((item) => this.mapToDomain(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string, viewerUserId: string): Promise<Exercise | null> {
    const entity = await this.exercises
      .createQueryBuilder('e')
      .where('e.id = :id', { id })
      .andWhere(this.visibilityWhere('e'), { viewerUserId })
      .getOne()

    return entity ? this.mapToDomain(entity) : null
  }

  async create(input: CreateExerciseRepositoryInput): Promise<Exercise> {
    if (input.id) {
      const existing = await this.exercises.findOne({ where: { id: input.id } })
      if (existing) {
        // Idempotent create: only return if caller owns it or it is system and they are creating as system.
        if (
          existing.userId === input.userId ||
          (existing.userId === null && input.userId === null)
        ) {
          return this.mapToDomain(existing)
        }
      }
    }

    const entity = this.exercises.create({
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      muscleGroup: input.muscleGroup ?? null,
      difficulty: input.difficulty ?? null,
      metadata: input.metadata ?? {},
    })

    const saved = await this.exercises.save(entity)
    return this.mapToDomain(saved)
  }

  async update(input: UpdateExerciseRepositoryInput): Promise<Exercise | null> {
    const entity = await this.exercises.findOne({ where: { id: input.id } })
    if (!entity) {
      return null
    }

    if (input.userId !== undefined) entity.userId = input.userId
    if (input.name !== undefined) entity.name = input.name
    if (input.description !== undefined) entity.description = input.description
    if (input.muscleGroup !== undefined) entity.muscleGroup = input.muscleGroup
    if (input.difficulty !== undefined) entity.difficulty = input.difficulty
    if (input.metadata !== undefined) entity.metadata = input.metadata

    const saved = await this.exercises.save(entity)
    return this.mapToDomain(saved)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.exercises.delete(id)
    return (result.affected ?? 0) > 0
  }
}

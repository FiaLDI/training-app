import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'

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
      name: entity.name,
      description: entity.description,
      muscleGroup: entity.muscleGroup,
      equipment: entity.equipment,
      difficulty: entity.difficulty,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  async list(input: ListExercisesRepositoryInput): Promise<ListExercisesRepositoryOutput> {
    const where = input.q ? { name: ILike(`%${input.q}%`) } : {}

    const [items, total] = await this.exercises.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    })

    return {
      items: items.map((item) => this.mapToDomain(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string): Promise<Exercise | null> {
    const entity = await this.exercises.findOne({ where: { id } })
    return entity ? this.mapToDomain(entity) : null
  }

  async create(input: CreateExerciseRepositoryInput): Promise<Exercise> {
    const entity = this.exercises.create({
      name: input.name,
      description: input.description ?? null,
      muscleGroup: input.muscleGroup ?? null,
      equipment: input.equipment ?? null,
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

    if (input.name !== undefined) entity.name = input.name
    if (input.description !== undefined) entity.description = input.description
    if (input.muscleGroup !== undefined) entity.muscleGroup = input.muscleGroup
    if (input.equipment !== undefined) entity.equipment = input.equipment
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

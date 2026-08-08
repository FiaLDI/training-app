import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'

import {
  CreateTemplateExerciseRepositoryInput,
  CreateTemplateRepositoryInput,
  ListTemplatesRepositoryInput,
  ListTemplatesRepositoryOutput,
  TemplateRepositoryPort,
  UpdateTemplateExerciseRepositoryInput,
  UpdateTemplateRepositoryInput,
} from '../core/ports/template-repository.port'
import { TemplateExercise, WorkoutTemplate, WorkoutTemplateWithExercises } from '../core/types'
import { TemplateExerciseEntity } from '../core/entity/template-exercise.entity'
import { WorkoutTemplateEntity } from '../core/entity/workout-template.entity'

@Injectable()
export class TemplateTypeormRepository implements TemplateRepositoryPort {
  constructor(
    @InjectRepository(WorkoutTemplateEntity)
    private readonly templates: Repository<WorkoutTemplateEntity>,
    @InjectRepository(TemplateExerciseEntity)
    private readonly templateExercises: Repository<TemplateExerciseEntity>,
  ) {}

  private mapTemplate(entity: WorkoutTemplateEntity): WorkoutTemplate {
    return {
      id: entity.id,
      userId: entity.userId,
      name: entity.name,
      description: entity.description,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  private mapExercise(entity: TemplateExerciseEntity): TemplateExercise {
    return {
      id: entity.id,
      templateId: entity.templateId,
      exerciseId: entity.exerciseId,
      exerciseOrder: entity.exerciseOrder,
      targetSets: entity.targetSets,
      isWarmup: entity.isWarmup ?? false,
      minReps: entity.minReps,
      maxReps: entity.maxReps,
      targetWeight: entity.targetWeight === null ? null : Number(entity.targetWeight),
      restSeconds: entity.restSeconds,
      notes: entity.notes,
      metadata: entity.metadata ?? {},
    }
  }

  private async ownsTemplate(templateId: string, userId: string): Promise<boolean> {
    const count = await this.templates.count({ where: { id: templateId, userId } })
    return count > 0
  }

  private async findOwnedExercise(
    exerciseId: string,
    userId: string,
  ): Promise<TemplateExerciseEntity | null> {
    const entity = await this.templateExercises.findOne({ where: { id: exerciseId } })
    if (!entity) return null
    const owns = await this.ownsTemplate(entity.templateId, userId)
    return owns ? entity : null
  }

  async list(input: ListTemplatesRepositoryInput): Promise<ListTemplatesRepositoryOutput> {
    const where = input.q
      ? { userId: input.userId, name: ILike(`%${input.q}%`) }
      : { userId: input.userId }
    const [items, total] = await this.templates.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    })

    return {
      items: items.map((item) => this.mapTemplate(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string, userId: string): Promise<WorkoutTemplateWithExercises | null> {
    const entity = await this.templates.findOne({ where: { id, userId } })
    if (!entity) return null

    const exercises = await this.listExercises(id)
    return { ...this.mapTemplate(entity), exercises }
  }

  async create(input: CreateTemplateRepositoryInput): Promise<WorkoutTemplate> {
    if (input.id) {
      const existing = await this.templates.findOne({
        where: { id: input.id, userId: input.userId },
      })
      if (existing) return this.mapTemplate(existing)
    }

    const entity = this.templates.create({
      ...(input.id ? { id: input.id } : {}),
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapTemplate(await this.templates.save(entity))
  }

  async update(input: UpdateTemplateRepositoryInput): Promise<WorkoutTemplate | null> {
    const entity = await this.templates.findOne({ where: { id: input.id, userId: input.userId } })
    if (!entity) return null

    if (input.name !== undefined) entity.name = input.name
    if (input.description !== undefined) entity.description = input.description
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapTemplate(await this.templates.save(entity))
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.templates.delete({ id, userId })
    return (result.affected ?? 0) > 0
  }

  async listExercises(templateId: string): Promise<TemplateExercise[]> {
    const items = await this.templateExercises.find({
      where: { templateId },
      order: { exerciseOrder: 'ASC' },
    })
    return items.map((item) => this.mapExercise(item))
  }

  async createExercise(
    input: CreateTemplateExerciseRepositoryInput,
  ): Promise<TemplateExercise | null> {
    if (input.id) {
      const existing = await this.findOwnedExercise(input.id, input.userId)
      if (existing) return this.mapExercise(existing)
    }

    if (!(await this.ownsTemplate(input.templateId, input.userId))) return null

    const entity = this.templateExercises.create({
      ...(input.id ? { id: input.id } : {}),
      templateId: input.templateId,
      exerciseId: input.exerciseId,
      exerciseOrder: input.exerciseOrder,
      targetSets: input.targetSets,
      isWarmup: input.isWarmup ?? false,
      minReps: input.minReps ?? null,
      maxReps: input.maxReps ?? null,
      targetWeight:
        input.targetWeight === undefined || input.targetWeight === null
          ? null
          : String(input.targetWeight),
      restSeconds: input.restSeconds ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapExercise(await this.templateExercises.save(entity))
  }

  async updateExercise(
    input: UpdateTemplateExerciseRepositoryInput,
  ): Promise<TemplateExercise | null> {
    const entity = await this.findOwnedExercise(input.id, input.userId)
    if (!entity) return null

    if (input.exerciseOrder !== undefined) entity.exerciseOrder = input.exerciseOrder
    if (input.targetSets !== undefined) entity.targetSets = input.targetSets
    if (input.isWarmup !== undefined) entity.isWarmup = input.isWarmup
    if (input.minReps !== undefined) entity.minReps = input.minReps
    if (input.maxReps !== undefined) entity.maxReps = input.maxReps
    if (input.targetWeight !== undefined) {
      entity.targetWeight = input.targetWeight === null ? null : String(input.targetWeight)
    }
    if (input.restSeconds !== undefined) entity.restSeconds = input.restSeconds
    if (input.notes !== undefined) entity.notes = input.notes
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapExercise(await this.templateExercises.save(entity))
  }

  async deleteExercise(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedExercise(id, userId)
    if (!entity) return false
    const result = await this.templateExercises.delete(id)
    return (result.affected ?? 0) > 0
  }
}

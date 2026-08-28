import { Injectable } from '@nestjs/common'
import { areExerciseOrdersContiguous, groupTypeFromMemberCount } from '../../../common/core/exercise-group'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'

import {
  AddExerciseToTemplateGroupRepositoryInput,
  CreateTemplateExerciseGroupRepositoryInput,
  CreateTemplateExerciseRepositoryInput,
  CreateTemplateRepositoryInput,
  ListTemplatesRepositoryInput,
  ListTemplatesRepositoryOutput,
  TemplateRepositoryPort,
  UpdateTemplateExerciseGroupRepositoryInput,
  UpdateTemplateExerciseRepositoryInput,
  UpdateTemplateRepositoryInput,
} from '../core/ports/template-repository.port'
import { TemplateExercise, TemplateExerciseGroup, WorkoutTemplate, WorkoutTemplateWithExercises } from '../core/types'
import { TemplateExerciseGroupEntity } from '../core/entity/template-exercise-group.entity'
import { TemplateExerciseEntity } from '../core/entity/template-exercise.entity'
import { WorkoutTemplateEntity } from '../core/entity/workout-template.entity'

@Injectable()
export class TemplateTypeormRepository implements TemplateRepositoryPort {
  constructor(
    @InjectRepository(WorkoutTemplateEntity)
    private readonly templates: Repository<WorkoutTemplateEntity>,
    @InjectRepository(TemplateExerciseEntity)
    private readonly templateExercises: Repository<TemplateExerciseEntity>,
    @InjectRepository(TemplateExerciseGroupEntity)
    private readonly templateGroups: Repository<TemplateExerciseGroupEntity>,
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

  private mapGroup(entity: TemplateExerciseGroupEntity): TemplateExerciseGroup {
    return {
      id: entity.id,
      templateId: entity.templateId,
      type: entity.type as TemplateExerciseGroup['type'],
      groupOrder: entity.groupOrder,
      restSeconds: entity.restSeconds,
      metadata: entity.metadata ?? {},
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
      groupId: entity.groupId,
      positionInGroup: entity.positionInGroup,
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
    const groups = await this.listGroups(id)
    return { ...this.mapTemplate(entity), exercises, groups }
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
      groupId: input.groupId ?? null,
      positionInGroup: input.positionInGroup ?? null,
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
    if (input.groupId !== undefined) entity.groupId = input.groupId
    if (input.positionInGroup !== undefined) entity.positionInGroup = input.positionInGroup
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapExercise(await this.templateExercises.save(entity))
  }

  async deleteExercise(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedExercise(id, userId)
    if (!entity) return false

    if (entity.groupId) {
      const groupId = entity.groupId
      const partners = await this.templateExercises.find({ where: { groupId } })
      for (const partner of partners) {
        if (partner.id === entity.id) continue
        partner.groupId = null
        partner.positionInGroup = null
        await this.templateExercises.save(partner)
      }
      await this.templateGroups.delete(groupId)
    }

    const result = await this.templateExercises.delete(id)
    return (result.affected ?? 0) > 0
  }

  async listGroups(templateId: string): Promise<TemplateExerciseGroup[]> {
    const items = await this.templateGroups.find({
      where: { templateId },
      order: { groupOrder: 'ASC' },
    })
    return items.map((item) => this.mapGroup(item))
  }

  async createGroup(
    input: CreateTemplateExerciseGroupRepositoryInput,
  ): Promise<TemplateExerciseGroup | null> {
    if (input.id) {
      const existing = await this.templateGroups.findOne({ where: { id: input.id } })
      if (existing && (await this.ownsTemplate(existing.templateId, input.userId))) {
        return this.mapGroup(existing)
      }
    }

    if (!(await this.ownsTemplate(input.templateId, input.userId))) return null

    const resolved = await Promise.all(
      input.exerciseIds.map((id) => this.findOwnedExercise(id, input.userId)),
    )
    if (resolved.some((item) => !item)) return null

    const exercises = resolved.filter((item): item is NonNullable<typeof item> => item != null)
    if (exercises.some((item) => item.templateId !== input.templateId)) return null

    const alreadyGrouped = exercises.filter((item) => item.groupId)
    if (alreadyGrouped.length > 0) {
      if (
        input.id &&
        alreadyGrouped.length === exercises.length &&
        alreadyGrouped.every((item) => item.groupId === input.id)
      ) {
        const existing = await this.templateGroups.findOne({ where: { id: input.id } })
        if (existing) return this.mapGroup(existing)
      }
      return null
    }

    const orders = exercises.map((item) => item.exerciseOrder)
    if (!areExerciseOrdersContiguous(orders)) return null

    const sorted = [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    const syncedTargetSets = Math.max(...sorted.map((item) => item.targetSets))
    const memberCount = sorted.length

    const groupEntity = this.templateGroups.create({
      ...(input.id ? { id: input.id } : {}),
      templateId: input.templateId,
      type: input.type ?? groupTypeFromMemberCount(memberCount),
      groupOrder: input.groupOrder,
      restSeconds: input.restSeconds ?? null,
      metadata: input.metadata ?? {},
    })
    const savedGroup = await this.templateGroups.save(groupEntity)

    for (let i = 0; i < sorted.length; i += 1) {
      sorted[i].groupId = savedGroup.id
      sorted[i].positionInGroup = i
      sorted[i].targetSets = syncedTargetSets
    }
    await this.templateExercises.save(sorted)

    return this.mapGroup(savedGroup)
  }

  async addExerciseToGroup(
    input: AddExerciseToTemplateGroupRepositoryInput,
  ): Promise<TemplateExerciseGroup | null> {
    const group = await this.templateGroups.findOne({ where: { id: input.groupId } })
    if (!group || !(await this.ownsTemplate(group.templateId, input.userId))) return null

    const exercise = await this.findOwnedExercise(input.exerciseId, input.userId)
    if (!exercise || exercise.templateId !== group.templateId) return null
    if (exercise.groupId === group.id) return this.mapGroup(group)
    if (exercise.groupId) return null

    const members = await this.templateExercises.find({
      where: { groupId: group.id },
      order: { positionInGroup: 'ASC' },
    })
    const maxOrder = Math.max(...members.map((item) => item.exerciseOrder))
    if (exercise.exerciseOrder !== maxOrder + 1) return null

    const syncedTargetSets = Math.max(...members.map((item) => item.targetSets), exercise.targetSets)
    exercise.groupId = group.id
    exercise.positionInGroup = members.length
    exercise.targetSets = syncedTargetSets
    await this.templateExercises.save(exercise)

    for (const member of members) {
      member.targetSets = syncedTargetSets
    }
    await this.templateExercises.save(members)

    group.type = groupTypeFromMemberCount(members.length + 1)
    return this.mapGroup(await this.templateGroups.save(group))
  }

  async updateGroup(
    input: UpdateTemplateExerciseGroupRepositoryInput,
  ): Promise<TemplateExerciseGroup | null> {
    const entity = await this.templateGroups.findOne({ where: { id: input.id } })
    if (!entity) return null
    if (!(await this.ownsTemplate(entity.templateId, input.userId))) return null

    if (input.restSeconds !== undefined) entity.restSeconds = input.restSeconds
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapGroup(await this.templateGroups.save(entity))
  }

  async deleteGroup(id: string, userId: string): Promise<boolean> {
    const entity = await this.templateGroups.findOne({ where: { id } })
    if (!entity) return false
    if (!(await this.ownsTemplate(entity.templateId, userId))) return false

    const members = await this.templateExercises.find({ where: { groupId: id } })
    for (const member of members) {
      member.groupId = null
      member.positionInGroup = null
      await this.templateExercises.save(member)
    }

    const result = await this.templateGroups.delete(id)
    return (result.affected ?? 0) > 0
  }
}

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  CreateProgramDayRepositoryInput,
  CreateProgramRepositoryInput,
  ListProgramsRepositoryInput,
  ListProgramsRepositoryOutput,
  ProgramRepositoryPort,
  UpdateProgramDayRepositoryInput,
  UpdateProgramRepositoryInput,
} from '../core/ports/program-repository.port'
import { Program, ProgramDay, ProgramWithDays } from '../core/types'
import { ProgramDayEntity } from '../core/entity/program-day.entity'
import { ProgramEntity } from '../core/entity/program.entity'

@Injectable()
export class ProgramTypeormRepository implements ProgramRepositoryPort {
  constructor(
    @InjectRepository(ProgramEntity)
    private readonly programs: Repository<ProgramEntity>,
    @InjectRepository(ProgramDayEntity)
    private readonly programDays: Repository<ProgramDayEntity>,
  ) {}

  private mapProgram(entity: ProgramEntity, dayCount?: number): Program {
    return {
      id: entity.id,
      userId: entity.userId,
      isSystem: entity.isSystem,
      name: entity.name,
      description: entity.description,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      ...(dayCount === undefined ? {} : { dayCount }),
    }
  }

  private mapDay(entity: ProgramDayEntity): ProgramDay {
    return {
      id: entity.id,
      programId: entity.programId,
      dayOfWeek: entity.dayOfWeek,
      slotOrder: entity.slotOrder,
      templateId: entity.templateId,
      notes: entity.notes,
    }
  }

  private async ownsProgram(programId: string, userId: string): Promise<boolean> {
    const count = await this.programs.count({
      where: { id: programId, userId, isSystem: false },
    })
    return count > 0
  }

  private async findOwnedDay(dayId: string, userId: string): Promise<ProgramDayEntity | null> {
    const entity = await this.programDays.findOne({ where: { id: dayId } })
    if (!entity) return null
    const owns = await this.ownsProgram(entity.programId, userId)
    return owns ? entity : null
  }

  async list(input: ListProgramsRepositoryInput): Promise<ListProgramsRepositoryOutput> {
    const qb = this.programs
      .createQueryBuilder('p')
      .where('(p.user_id = :userId OR p.is_system = true)', { userId: input.userId })
      .orderBy('p.is_system', 'ASC')
      .addOrderBy('p.created_at', 'DESC')
      .skip((input.page - 1) * input.limit)
      .take(input.limit)

    const [items, total] = await qb.getManyAndCount()

    const countRows =
      items.length === 0
        ? []
        : await this.programDays
            .createQueryBuilder('d')
            .select('d.programId', 'programId')
            .addSelect('COUNT(*)', 'count')
            .where('d.programId IN (:...ids)', { ids: items.map((item) => item.id) })
            .groupBy('d.programId')
            .getRawMany<{ programId: string; count: string }>()
    const dayCountById = new Map(
      countRows.map((row) => [row.programId, Number(row.count)]),
    )

    return {
      items: items.map((item) => this.mapProgram(item, dayCountById.get(item.id) ?? 0)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string, userId: string): Promise<ProgramWithDays | null> {
    const entity = await this.programs.findOne({ where: { id } })
    if (!entity) return null
    if (!entity.isSystem && entity.userId !== userId) return null
    const days = await this.listDays(id)
    return { ...this.mapProgram(entity), days }
  }

  async findUserFork(userId: string, sourceProgramId: string): Promise<ProgramWithDays | null> {
    const entity = await this.programs
      .createQueryBuilder('p')
      .where('p.user_id = :userId', { userId })
      .andWhere("p.metadata->>'forkedFrom' = :source", { source: sourceProgramId })
      .orderBy('p.created_at', 'DESC')
      .getOne()
    if (!entity) return null
    const days = await this.listDays(entity.id)
    return { ...this.mapProgram(entity), days }
  }

  async getByIdAny(id: string): Promise<ProgramWithDays | null> {
    const entity = await this.programs.findOne({ where: { id } })
    if (!entity) return null
    const days = await this.listDays(id)
    return { ...this.mapProgram(entity), days }
  }

  async create(input: CreateProgramRepositoryInput): Promise<Program> {
    const isSystem = input.isSystem === true
    const entity = this.programs.create({
      userId: isSystem ? null : input.userId,
      isSystem,
      name: input.name,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapProgram(await this.programs.save(entity))
  }

  async update(input: UpdateProgramRepositoryInput): Promise<Program | null> {
    const entity = await this.programs.findOne({
      where: { id: input.id, userId: input.userId, isSystem: false },
    })
    if (!entity) return null

    if (input.name !== undefined) entity.name = input.name
    if (input.description !== undefined) entity.description = input.description
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapProgram(await this.programs.save(entity))
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.programs.delete({ id, userId, isSystem: false })
    return (result.affected ?? 0) > 0
  }

  async listDays(programId: string): Promise<ProgramDay[]> {
    const items = await this.programDays.find({
      where: { programId },
      order: { dayOfWeek: 'ASC', slotOrder: 'ASC' },
    })
    return items.map((item) => this.mapDay(item))
  }

  async createDay(input: CreateProgramDayRepositoryInput): Promise<ProgramDay | null> {
    if (!(await this.ownsProgram(input.programId, input.userId))) return null

    const entity = this.programDays.create({
      programId: input.programId,
      dayOfWeek: input.dayOfWeek,
      slotOrder: input.slotOrder,
      templateId: input.templateId ?? null,
      notes: input.notes ?? null,
    })
    return this.mapDay(await this.programDays.save(entity))
  }

  async updateDay(input: UpdateProgramDayRepositoryInput): Promise<ProgramDay | null> {
    const entity = await this.findOwnedDay(input.id, input.userId)
    if (!entity) return null

    if (input.dayOfWeek !== undefined) entity.dayOfWeek = input.dayOfWeek
    if (input.slotOrder !== undefined) entity.slotOrder = input.slotOrder
    if (input.templateId !== undefined) entity.templateId = input.templateId
    if (input.notes !== undefined) entity.notes = input.notes

    return this.mapDay(await this.programDays.save(entity))
  }

  async deleteDay(id: string, userId: string): Promise<boolean> {
    const entity = await this.findOwnedDay(id, userId)
    if (!entity) return false
    const result = await this.programDays.delete(id)
    return (result.affected ?? 0) > 0
  }
}

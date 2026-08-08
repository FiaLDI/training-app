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

  private mapProgram(entity: ProgramEntity): Program {
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
    const count = await this.programs.count({ where: { id: programId, userId } })
    return count > 0
  }

  private async findOwnedDay(dayId: string, userId: string): Promise<ProgramDayEntity | null> {
    const entity = await this.programDays.findOne({ where: { id: dayId } })
    if (!entity) return null
    const owns = await this.ownsProgram(entity.programId, userId)
    return owns ? entity : null
  }

  async list(input: ListProgramsRepositoryInput): Promise<ListProgramsRepositoryOutput> {
    const [items, total] = await this.programs.findAndCount({
      where: { userId: input.userId },
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    })

    return {
      items: items.map((item) => this.mapProgram(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string, userId: string): Promise<ProgramWithDays | null> {
    const entity = await this.programs.findOne({ where: { id, userId } })
    if (!entity) return null
    const days = await this.listDays(id)
    return { ...this.mapProgram(entity), days }
  }

  async create(input: CreateProgramRepositoryInput): Promise<Program> {
    const entity = this.programs.create({
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapProgram(await this.programs.save(entity))
  }

  async update(input: UpdateProgramRepositoryInput): Promise<Program | null> {
    const entity = await this.programs.findOne({ where: { id: input.id, userId: input.userId } })
    if (!entity) return null

    if (input.name !== undefined) entity.name = input.name
    if (input.description !== undefined) entity.description = input.description
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapProgram(await this.programs.save(entity))
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.programs.delete({ id, userId })
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

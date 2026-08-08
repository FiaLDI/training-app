import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'

import {
  CreateEquipmentRepositoryInput,
  EquipmentRepositoryPort,
  ListEquipmentRepositoryInput,
  ListEquipmentRepositoryOutput,
} from '../core/ports/equipment-repository.port'
import { Equipment } from '../core/types'
import { EquipmentEntity } from '../core/entity/equipment.entity'

@Injectable()
export class EquipmentTypeormRepository implements EquipmentRepositoryPort {
  constructor(
    @InjectRepository(EquipmentEntity)
    private readonly equipment: Repository<EquipmentEntity>,
  ) {}

  private mapToDomain(entity: EquipmentEntity): Equipment {
    return {
      id: entity.id,
      name: entity.name,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }

  async list(input: ListEquipmentRepositoryInput): Promise<ListEquipmentRepositoryOutput> {
    const where = input.q ? { name: ILike(`%${input.q}%`) } : {}
    const [items, total] = await this.equipment.findAndCount({
      where,
      order: { name: 'ASC' },
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

  async getById(id: string): Promise<Equipment | null> {
    const entity = await this.equipment.findOne({ where: { id } })
    return entity ? this.mapToDomain(entity) : null
  }

  async findByName(name: string): Promise<Equipment | null> {
    const entity = await this.equipment
      .createQueryBuilder('equipment')
      .where('lower(equipment.name) = lower(:name)', { name: name.trim() })
      .getOne()

    return entity ? this.mapToDomain(entity) : null
  }

  async create(input: CreateEquipmentRepositoryInput): Promise<Equipment> {
    if (input.id) {
      const existing = await this.equipment.findOne({ where: { id: input.id } })
      if (existing) return this.mapToDomain(existing)
    }

    const entity = this.equipment.create({
      ...(input.id ? { id: input.id } : {}),
      name: input.name.trim(),
      metadata: input.metadata ?? {},
    })
    return this.mapToDomain(await this.equipment.save(entity))
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.equipment.delete(id)
    return (result.affected ?? 0) > 0
  }
}

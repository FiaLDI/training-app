import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'

import { BodyMeasurementEntity } from '../core/entity/body-measurement.entity'
import { BodyMeasurement } from '../core/types'

function toNumber(value: string | null | undefined): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

@Injectable()
export class BodyMeasurementTypeormRepository {
  constructor(
    @InjectRepository(BodyMeasurementEntity)
    private readonly repo: Repository<BodyMeasurementEntity>,
  ) {}

  private map(entity: BodyMeasurementEntity): BodyMeasurement {
    return {
      id: entity.id,
      userId: entity.userId,
      weight: toNumber(entity.weight),
      measuredAt: entity.measuredAt.toISOString(),
      metadata: entity.metadata ?? {},
    }
  }

  async list(userId: string, from?: string, to?: string): Promise<BodyMeasurement[]> {
    const where: Record<string, unknown> = { userId }
    if (from && to) {
      where.measuredAt = Between(new Date(from), new Date(to))
    }
    const items = await this.repo.find({
      where,
      order: { measuredAt: 'DESC' },
    })
    return items.map((item) => this.map(item))
  }

  async create(input: {
    id?: string
    userId: string
    weight: number
    measuredAt?: string
    metadata?: Record<string, unknown>
  }): Promise<BodyMeasurement> {
    if (input.id) {
      const existing = await this.repo.findOne({ where: { id: input.id, userId: input.userId } })
      if (existing) return this.map(existing)
    }

    const entity = this.repo.create({
      id: input.id,
      userId: input.userId,
      weight: String(input.weight),
      measuredAt: input.measuredAt ? new Date(input.measuredAt) : new Date(),
      metadata: input.metadata ?? {},
    })
    const saved = await this.repo.save(entity)
    return this.map(saved)
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await this.repo.delete({ id, userId })
    return (result.affected ?? 0) > 0
  }
}

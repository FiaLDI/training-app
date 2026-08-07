import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  CreateSourceRepositoryInput,
  CreateTimecodeRepositoryInput,
  ListSourcesRepositoryInput,
  ListSourcesRepositoryOutput,
  SourceRepositoryPort,
  UpdateSourceRepositoryInput,
  UpdateTimecodeRepositoryInput,
} from '../core/ports/source-repository.port'
import { ExerciseSource, ExerciseTimecode } from '../core/types'
import { ExerciseSourceEntity } from '../core/entity/exercise-source.entity'
import { ExerciseTimecodeEntity } from '../core/entity/exercise-timecode.entity'

@Injectable()
export class SourceTypeormRepository implements SourceRepositoryPort {
  constructor(
    @InjectRepository(ExerciseSourceEntity)
    private readonly sources: Repository<ExerciseSourceEntity>,
    @InjectRepository(ExerciseTimecodeEntity)
    private readonly timecodes: Repository<ExerciseTimecodeEntity>,
  ) {}

  private mapSource(entity: ExerciseSourceEntity): ExerciseSource {
    return {
      id: entity.id,
      exerciseId: entity.exerciseId,
      type: entity.type,
      title: entity.title,
      url: entity.url,
      metadata: entity.metadata ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  private mapTimecode(entity: ExerciseTimecodeEntity): ExerciseTimecode {
    return {
      id: entity.id,
      sourceId: entity.sourceId,
      seconds: entity.seconds,
      title: entity.title,
      metadata: entity.metadata ?? {},
    }
  }

  async list(input: ListSourcesRepositoryInput): Promise<ListSourcesRepositoryOutput> {
    const where = input.exerciseId ? { exerciseId: input.exerciseId } : {}
    const [items, total] = await this.sources.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    })

    return {
      items: items.map((item) => this.mapSource(item)),
      total,
      page: input.page,
      limit: input.limit,
    }
  }

  async getById(id: string): Promise<ExerciseSource | null> {
    const entity = await this.sources.findOne({ where: { id } })
    return entity ? this.mapSource(entity) : null
  }

  async create(input: CreateSourceRepositoryInput): Promise<ExerciseSource> {
    const entity = this.sources.create({
      exerciseId: input.exerciseId,
      type: input.type,
      title: input.title ?? null,
      url: input.url,
      metadata: input.metadata ?? {},
    })
    return this.mapSource(await this.sources.save(entity))
  }

  async update(input: UpdateSourceRepositoryInput): Promise<ExerciseSource | null> {
    const entity = await this.sources.findOne({ where: { id: input.id } })
    if (!entity) return null

    if (input.type !== undefined) entity.type = input.type
    if (input.title !== undefined) entity.title = input.title
    if (input.url !== undefined) entity.url = input.url
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapSource(await this.sources.save(entity))
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sources.delete(id)
    return (result.affected ?? 0) > 0
  }

  async listTimecodes(sourceId: string): Promise<ExerciseTimecode[]> {
    const items = await this.timecodes.find({
      where: { sourceId },
      order: { seconds: 'ASC' },
    })
    return items.map((item) => this.mapTimecode(item))
  }

  async getTimecodeById(id: string): Promise<ExerciseTimecode | null> {
    const entity = await this.timecodes.findOne({ where: { id } })
    return entity ? this.mapTimecode(entity) : null
  }

  async createTimecode(input: CreateTimecodeRepositoryInput): Promise<ExerciseTimecode> {
    const entity = this.timecodes.create({
      sourceId: input.sourceId,
      seconds: input.seconds,
      title: input.title ?? null,
      metadata: input.metadata ?? {},
    })
    return this.mapTimecode(await this.timecodes.save(entity))
  }

  async updateTimecode(input: UpdateTimecodeRepositoryInput): Promise<ExerciseTimecode | null> {
    const entity = await this.timecodes.findOne({ where: { id: input.id } })
    if (!entity) return null

    if (input.seconds !== undefined) entity.seconds = input.seconds
    if (input.title !== undefined) entity.title = input.title
    if (input.metadata !== undefined) entity.metadata = input.metadata

    return this.mapTimecode(await this.timecodes.save(entity))
  }

  async deleteTimecode(id: string): Promise<boolean> {
    const result = await this.timecodes.delete(id)
    return (result.affected ?? 0) > 0
  }
}

import { ConflictException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { FeedbackEntity } from '../core/entity/feedback.entity'
import { Feedback, FeedbackCategory, FeedbackStatus } from '../core/types'

@Injectable()
export class FeedbackTypeormRepository {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly repo: Repository<FeedbackEntity>,
  ) {}

  private map(entity: FeedbackEntity): Feedback {
    return {
      id: entity.id,
      userId: entity.userId,
      category: entity.category as FeedbackCategory,
      message: entity.message,
      rating: entity.rating,
      status: entity.status as FeedbackStatus,
      clientMeta: entity.clientMeta ?? {},
      createdAt: entity.createdAt.toISOString(),
    }
  }

  async listByUser(userId: string): Promise<Feedback[]> {
    const items = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    return items.map((item) => this.map(item))
  }

  async listAll(): Promise<Feedback[]> {
    const items = await this.repo.find({
      order: { createdAt: 'DESC' },
    })
    return items.map((item) => this.map(item))
  }

  async setStatus(id: string, status: FeedbackStatus): Promise<Feedback | null> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return null
    entity.status = status
    return this.map(await this.repo.save(entity))
  }

  async deleteResolved(id: string): Promise<'deleted' | 'not_found' | 'not_resolved'> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return 'not_found'
    if (entity.status !== 'resolved') return 'not_resolved'
    await this.repo.remove(entity)
    return 'deleted'
  }

  async create(input: {
    id?: string
    userId: string | null
    category: FeedbackCategory
    message: string
    rating?: number | null
    clientMeta?: Record<string, unknown>
  }): Promise<Feedback> {
    if (input.id) {
      const existing = await this.repo.findOne({ where: { id: input.id } })
      if (existing) {
        if (existing.userId === input.userId) {
          return this.map(existing)
        }
        throw new ConflictException('Feedback id already exists')
      }
    }

    const entity = this.repo.create({
      id: input.id,
      userId: input.userId,
      category: input.category,
      message: input.message,
      rating: input.rating ?? null,
      status: 'new',
      clientMeta: input.clientMeta ?? {},
    })
    const saved = await this.repo.save(entity)
    return this.map(saved)
  }
}

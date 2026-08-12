import { Injectable } from '@nestjs/common'
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
      if (existing) return this.map(existing)
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

import { ConflictException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository, SelectQueryBuilder } from 'typeorm'

import { UserEntity } from '../../auth/core/entity/user.entity'
import { FeedbackEntity } from '../core/entity/feedback.entity'
import {
  Feedback,
  FeedbackCategory,
  FeedbackInboxOrder,
  FeedbackInboxSort,
  FeedbackPriority,
  FeedbackStatus,
  ListInboxQuery,
  ListInboxResult,
} from '../core/types'

@Injectable()
export class FeedbackTypeormRepository {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly repo: Repository<FeedbackEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  private map(entity: FeedbackEntity, authorEmail?: string | null): Feedback {
    return {
      id: entity.id,
      userId: entity.userId,
      category: entity.category as FeedbackCategory,
      message: entity.message,
      rating: entity.rating,
      status: entity.status as FeedbackStatus,
      priority: (entity.priority as FeedbackPriority) || 'normal',
      clientMeta: entity.clientMeta ?? {},
      createdAt: entity.createdAt.toISOString(),
      ...(authorEmail !== undefined ? { authorEmail } : {}),
    }
  }

  async listByUser(userId: string): Promise<Feedback[]> {
    const items = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
    return items.map((item) => this.map(item))
  }

  async listInbox(query: ListInboxQuery): Promise<ListInboxResult> {
    const qb = this.repo.createQueryBuilder('f')

    if (query.status) {
      qb.andWhere('f.status = :status', { status: query.status })
    }
    if (query.priority) {
      qb.andWhere('f.priority = :priority', { priority: query.priority })
    }
    if (query.category) {
      qb.andWhere('f.category = :category', { category: query.category })
    }

    const q = query.q?.trim()
    if (q) {
      qb.leftJoin(UserEntity, 'u', 'u.id = f.user_id')
      qb.andWhere('(f.message ILIKE :q OR u.email ILIKE :q)', { q: `%${q}%` })
    }

    this.applyInboxSort(qb, query.sort, query.order)

    qb.skip((query.page - 1) * query.limit).take(query.limit)

    const [items, total] = await qb.getManyAndCount()
    const mapped = await this.withAuthorEmails(items)

    return {
      items: mapped,
      total,
      page: query.page,
      limit: query.limit,
    }
  }

  async setStatus(id: string, status: FeedbackStatus): Promise<Feedback | null> {
    return this.update(id, { status })
  }

  async update(
    id: string,
    patch: { status?: FeedbackStatus; priority?: FeedbackPriority },
  ): Promise<Feedback | null> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return null
    if (patch.status !== undefined) entity.status = patch.status
    if (patch.priority !== undefined) entity.priority = patch.priority
    const saved = await this.repo.save(entity)
    return this.map(saved)
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
      priority: 'normal',
      clientMeta: input.clientMeta ?? {},
    })
    const saved = await this.repo.save(entity)
    return this.map(saved)
  }

  private applyInboxSort(
    qb: SelectQueryBuilder<FeedbackEntity>,
    sort: FeedbackInboxSort,
    order: FeedbackInboxOrder,
  ) {
    const direction = order === 'asc' ? 'ASC' : 'DESC'

    if (sort === 'createdAt') {
      qb.orderBy('f.createdAt', direction)
      return
    }

    if (sort === 'priority') {
      qb.orderBy(
        `(CASE f.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END)`,
        direction,
      )
      qb.addOrderBy('f.createdAt', 'DESC')
      return
    }

    if (sort === 'status') {
      qb.orderBy(
        `(CASE f.status WHEN 'new' THEN 0 WHEN 'read' THEN 1 ELSE 2 END)`,
        direction,
      )
      qb.addOrderBy('f.createdAt', 'DESC')
      return
    }

    qb.orderBy(`(CASE WHEN f.status = 'resolved' THEN 1 ELSE 0 END)`, 'ASC')
    qb.addOrderBy(`(CASE f.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END)`, 'ASC')
    qb.addOrderBy('f.createdAt', 'DESC')
  }

  private async withAuthorEmails(items: FeedbackEntity[]): Promise<Feedback[]> {
    const userIds = [...new Set(items.map((item) => item.userId).filter((id): id is string => Boolean(id)))]
    const users = userIds.length > 0 ? await this.users.find({ where: { id: In(userIds) } }) : []
    const emailById = new Map(users.map((user) => [user.id, user.email]))
    return items.map((item) => this.map(item, item.userId ? (emailById.get(item.userId) ?? null) : null))
  }
}

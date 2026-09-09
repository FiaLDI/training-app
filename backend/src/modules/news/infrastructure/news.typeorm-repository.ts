import { ConflictException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { NewsEntity } from '../core/entity/news.entity'
import type { CreateNewsInput, News, NewsListItem, UpdateNewsInput } from '../core/types'

@Injectable()
export class NewsTypeormRepository {
  constructor(
    @InjectRepository(NewsEntity)
    private readonly repo: Repository<NewsEntity>,
  ) {}

  async list(): Promise<NewsListItem[]> {
    const items = await this.repo.find({
      order: { publishedAt: 'DESC' },
    })
    return items.map((item) => this.mapListItem(item))
  }

  async findBySlug(slug: string): Promise<News | null> {
    const entity = await this.repo.findOne({ where: { slug } })
    return entity ? this.map(entity) : null
  }

  async findById(id: string): Promise<News | null> {
    const entity = await this.repo.findOne({ where: { id } })
    return entity ? this.map(entity) : null
  }

  async create(input: CreateNewsInput): Promise<News> {
    const existing = await this.repo.findOne({ where: { slug: input.slug } })
    if (existing) {
      throw new ConflictException('Новость с таким адресом уже есть')
    }

    const entity = this.repo.create({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      sections: input.sections,
      publishedAt: new Date(input.publishedAt),
    })
    const saved = await this.repo.save(entity)
    return this.map(saved)
  }

  async update(id: string, patch: UpdateNewsInput): Promise<News | null> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return null

    if (patch.slug !== undefined && patch.slug !== entity.slug) {
      const taken = await this.repo.findOne({ where: { slug: patch.slug } })
      if (taken) {
        throw new ConflictException('Новость с таким адресом уже есть')
      }
      entity.slug = patch.slug
    }
    if (patch.title !== undefined) entity.title = patch.title
    if (patch.excerpt !== undefined) entity.excerpt = patch.excerpt
    if (patch.sections !== undefined) entity.sections = patch.sections
    if (patch.publishedAt !== undefined) entity.publishedAt = new Date(patch.publishedAt)

    const saved = await this.repo.save(entity)
    return this.map(saved)
  }

  async delete(id: string): Promise<boolean> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) return false
    await this.repo.remove(entity)
    return true
  }

  private mapListItem(entity: NewsEntity): NewsListItem {
    return {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      excerpt: entity.excerpt,
      publishedAt: entity.publishedAt.toISOString(),
    }
  }

  private map(entity: NewsEntity): News {
    return {
      ...this.mapListItem(entity),
      sections: entity.sections,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}

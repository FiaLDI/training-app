import { NotFoundException } from '@nestjs/common'

import { NewsTypeormRepository } from '../infrastructure/news.typeorm-repository'
import { NewsHttpController } from './news.http-controller'
import type { News, NewsListItem } from '../core/types'

describe('NewsHttpController', () => {
  const listItem: NewsListItem = {
    id: 'news-1',
    slug: 'what-you-can-do',
    title: 'Что можно делать в IronLog',
    excerpt: 'Журнал, планы и статистика.',
    publishedAt: '2026-09-09T00:00:00.000Z',
  }

  const full: News = {
    ...listItem,
    sections: [
      {
        type: 'paragraphs',
        heading: 'Журнал',
        paragraphs: ['Сегодня и Неделя.'],
      },
    ],
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  }

  let repository: jest.Mocked<
    Pick<NewsTypeormRepository, 'list' | 'findBySlug' | 'create' | 'update' | 'delete'>
  >
  let controller: NewsHttpController

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }
    controller = new NewsHttpController(repository as unknown as NewsTypeormRepository)
  })

  it('returns news ordered by the repository (published_at desc)', async () => {
    repository.list.mockResolvedValue([listItem])

    await expect(controller.list()).resolves.toEqual({ items: [listItem] })
    expect(repository.list).toHaveBeenCalled()
  })

  it('throws NotFoundException for unknown slug', async () => {
    repository.findBySlug.mockResolvedValue(null)

    await expect(controller.getBySlug('missing')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('returns news by slug', async () => {
    repository.findBySlug.mockResolvedValue(full)

    await expect(controller.getBySlug('what-you-can-do')).resolves.toEqual(full)
  })
})

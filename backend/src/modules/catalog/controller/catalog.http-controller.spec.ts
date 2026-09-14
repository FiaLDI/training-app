import { NotFoundException } from '@nestjs/common'

import { CatalogService } from '../core/catalog.service'
import { CatalogHttpController } from './catalog.http-controller'

describe('CatalogHttpController', () => {
  const item = {
    id: 'p1',
    slug: 'ppl',
    name: 'Push / Pull / Legs',
    author: 'IronLog',
    description: 'Сплит',
    tags: ['гипертрофия'],
    verified: true,
    daysPerWeek: 6,
    programId: 'sys-1',
    snapshot: { name: 'PPL', description: null, days: [] },
  }

  let catalog: jest.Mocked<Pick<CatalogService, 'list' | 'getBySlug' | 'install'>>
  let controller: CatalogHttpController

  beforeEach(() => {
    catalog = {
      list: jest.fn(),
      getBySlug: jest.fn(),
      install: jest.fn(),
    }
    controller = new CatalogHttpController(catalog as unknown as CatalogService)
  })

  it('lists catalog programs', async () => {
    catalog.list.mockResolvedValue([item])
    await expect(controller.list()).resolves.toEqual({ items: [item] })
  })

  it('throws when slug is missing', async () => {
    catalog.getBySlug.mockRejectedValue(new NotFoundException('Программа не найдена'))
    await expect(controller.getBySlug('missing')).rejects.toBeInstanceOf(NotFoundException)
  })
})

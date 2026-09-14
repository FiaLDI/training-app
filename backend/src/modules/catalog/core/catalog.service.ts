import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { InstallSnapshotService } from '../../program/core/lib/install-snapshot.service'
import { CatalogProgramEntity } from './entity/catalog-program.entity'
import type { ProgramSnapshot } from '../../program/core/lib/program-snapshot'

export type CatalogProgramListItem = {
  id: string
  slug: string
  name: string
  author: string
  description: string
  tags: string[]
  verified: boolean
  daysPerWeek: number
}

export type CatalogProgramDetail = CatalogProgramListItem & {
  snapshot: ProgramSnapshot
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogProgramEntity)
    private readonly programs: Repository<CatalogProgramEntity>,
    @Inject(InstallSnapshotService) private readonly installer: InstallSnapshotService,
  ) {}

  async list(): Promise<CatalogProgramListItem[]> {
    const items = await this.programs.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
    return items.map((item) => this.mapList(item))
  }

  async getBySlug(slug: string): Promise<CatalogProgramDetail> {
    const item = await this.programs.findOne({ where: { slug } })
    if (!item) throw new NotFoundException('Программа не найдена')
    return { ...this.mapList(item), snapshot: item.snapshot }
  }

  async install(userId: string, slug: string) {
    const item = await this.getBySlug(slug)
    const result = await this.installer.installProgram(userId, item.snapshot)
    return {
      programId: result.program?.id,
      skippedExercises: result.skippedExercises,
    }
  }

  private mapList(entity: CatalogProgramEntity): CatalogProgramListItem {
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      author: entity.author,
      description: entity.description,
      tags: entity.tags ?? [],
      verified: entity.verified,
      daysPerWeek: entity.snapshot.days.length,
    }
  }
}

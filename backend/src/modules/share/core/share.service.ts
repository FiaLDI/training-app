import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'

import { AUTH_REPOSITORY_PORT, AuthRepositoryPort } from '../../auth/core/ports/auth-repository.port'
import { InstallSnapshotService } from '../../program/core/lib/install-snapshot.service'
import type { SharedResource } from '../../program/core/lib/program-snapshot'
import { ProgramTypeormRepository } from '../../program/infrastructure/program.typeorm-repository'
import { TemplateTypeormRepository } from '../../template/infrastructure/template.typeorm-repository'
import { ShareLinkEntity } from '../core/entity/share-link.entity'
import { generateShareToken } from '../core/lib/generate-share-token'

export type ShareLinkView = {
  token: string
  resourceType: 'template' | 'program'
  resourceId: string
  createdAt: string
}

export type PublicShareView = {
  token: string
  resource: SharedResource
  ownerUsername: string
}

@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(ShareLinkEntity)
    private readonly links: Repository<ShareLinkEntity>,
    private readonly templates: TemplateTypeormRepository,
    private readonly programs: ProgramTypeormRepository,
    private readonly installer: InstallSnapshotService,
    @Inject(AUTH_REPOSITORY_PORT) private readonly users: AuthRepositoryPort,
  ) {}

  async createTemplateLink(userId: string, templateId: string): Promise<ShareLinkView> {
    const template = await this.templates.getById(templateId, userId)
    if (!template) throw new NotFoundException('План не найден')
    return this.upsertLink(userId, 'template', templateId)
  }

  async createProgramLink(userId: string, programId: string): Promise<ShareLinkView> {
    const program = await this.programs.getById(programId, userId)
    if (!program) throw new NotFoundException('Программа не найдена')
    return this.upsertLink(userId, 'program', programId)
  }

  async getMine(
    userId: string,
    resourceType: 'template' | 'program',
    resourceId: string,
  ): Promise<ShareLinkView | null> {
    const entity = await this.links.findOne({
      where: { ownerId: userId, resourceType, resourceId, revokedAt: IsNull() },
    })
    return entity ? this.mapLink(entity) : null
  }

  async getPublic(token: string): Promise<PublicShareView> {
    const link = await this.links.findOne({ where: { token, revokedAt: IsNull() } })
    if (!link) throw new NotFoundException('Ссылка недействительна')

    const resource = await this.loadResource(link)
    if (!resource) throw new NotFoundException('Материал больше недоступен')

    const owner = await this.users.findUserById(link.ownerId)
    return {
      token: link.token,
      resource,
      ownerUsername: owner?.username ?? 'Пользователь',
    }
  }

  async revoke(userId: string, token: string): Promise<void> {
    const link = await this.links.findOne({ where: { token, revokedAt: IsNull() } })
    if (!link) throw new NotFoundException('Ссылка не найдена')
    if (link.ownerId !== userId) throw new ForbiddenException('Нельзя отозвать чужую ссылку')
    link.revokedAt = new Date()
    await this.links.save(link)
  }

  async importForUser(userId: string, token: string) {
    const view = await this.getPublic(token)
    return this.installer.installShared(userId, view.resource)
  }

  private async upsertLink(
    userId: string,
    resourceType: 'template' | 'program',
    resourceId: string,
  ): Promise<ShareLinkView> {
    const existing = await this.links.findOne({
      where: { ownerId: userId, resourceType, resourceId, revokedAt: IsNull() },
    })
    if (existing) return this.mapLink(existing)

    const entity = this.links.create({
      token: generateShareToken(),
      ownerId: userId,
      resourceType,
      resourceId,
    })
    return this.mapLink(await this.links.save(entity))
  }

  private async loadResource(link: ShareLinkEntity): Promise<SharedResource | null> {
    if (link.resourceType === 'template') {
      const snapshot = await this.installer.snapshotTemplate(link.resourceId)
      if (!snapshot) return null
      return {
        kind: 'template',
        name: snapshot.name,
        description: snapshot.description,
        template: snapshot,
      }
    }

    const snapshot = await this.installer.snapshotProgram(link.resourceId)
    if (!snapshot) return null
    return {
      kind: 'program',
      name: snapshot.name,
      description: snapshot.description,
      program: snapshot,
    }
  }

  private mapLink(entity: ShareLinkEntity): ShareLinkView {
    return {
      token: entity.token,
      resourceType: entity.resourceType,
      resourceId: entity.resourceId,
      createdAt: entity.createdAt.toISOString(),
    }
  }
}

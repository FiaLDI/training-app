import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CatalogService } from '../core/catalog.service'

@ApiTags('catalog')
@Controller('catalog')
export class CatalogHttpController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'List verified workout programs' })
  @ApiOkResponse({ schema: { type: 'object' } })
  async list() {
    const items = await this.catalog.list()
    return { items }
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a catalog program with snapshot' })
  async getBySlug(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug)
  }

  @Post(':slug/install')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy a catalog program into my account' })
  async install(@CurrentUser() user: User, @Param('slug') slug: string) {
    return this.catalog.install(user.id, slug)
  }
}

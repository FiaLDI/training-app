import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'

import { AdminGuard } from '../../auth/infrastructure/admin.guard'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { NewsTypeormRepository } from '../infrastructure/news.typeorm-repository'
import { CreateNewsInputDto } from './dto/create-news-input.dto'
import { NewsListResponseDto, NewsResponseDto } from './dto/news-response.dto'
import { UpdateNewsInputDto } from './dto/update-news-input.dto'

@ApiTags('news')
@Controller('news')
export class NewsHttpController {
  constructor(
    @Inject(NewsTypeormRepository)
    private readonly repository: NewsTypeormRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List published news' })
  @ApiOkResponse({ type: NewsListResponseDto })
  async list() {
    const items = await this.repository.list()
    return { items }
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get news by slug' })
  @ApiParam({ name: 'slug' })
  @ApiOkResponse({ type: NewsResponseDto })
  async getBySlug(@Param('slug') slug: string) {
    const item = await this.repository.findBySlug(slug)
    if (!item) throw new NotFoundException('Новость не найдена')
    return item
  }

  @Post()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create news (admin)' })
  @ApiCreatedResponse({ type: NewsResponseDto })
  async create(@Body() dto: CreateNewsInputDto) {
    return this.repository.create({
      slug: dto.slug.trim().toLowerCase(),
      title: dto.title.trim(),
      excerpt: dto.excerpt.trim(),
      sections: dto.sections,
      publishedAt: dto.publishedAt,
    })
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update news (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: NewsResponseDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNewsInputDto) {
    if (
      dto.slug === undefined &&
      dto.title === undefined &&
      dto.excerpt === undefined &&
      dto.sections === undefined &&
      dto.publishedAt === undefined
    ) {
      throw new BadRequestException('Укажите поля для обновления')
    }

    const item = await this.repository.update(id, {
      slug: dto.slug?.trim().toLowerCase(),
      title: dto.title?.trim(),
      excerpt: dto.excerpt?.trim(),
      sections: dto.sections,
      publishedAt: dto.publishedAt,
    })
    if (!item) throw new NotFoundException('Новость не найдена')
    return item
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete news (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const deleted = await this.repository.delete(id)
    if (!deleted) throw new NotFoundException('Новость не найдена')
    return { deleted: true }
  }
}

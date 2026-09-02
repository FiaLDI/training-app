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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'
import { Request } from 'express'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import {
  AUTH_REPOSITORY_PORT,
  AuthRepositoryPort,
} from '../../auth/core/ports/auth-repository.port'
import { User } from '../../auth/core/types'
import { AdminGuard } from '../../auth/infrastructure/admin.guard'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { JwtTokenService } from '../../auth/infrastructure/jwt-token.service'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_INBOX_ORDERS,
  FEEDBACK_INBOX_SORTS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
} from '../core/types'
import { FeedbackTypeormRepository } from '../infrastructure/feedback.typeorm-repository'
import { CreateFeedbackInputDto } from './dto/create-feedback-input.dto'
import { FeedbackResponseDto } from './dto/feedback-response.dto'
import { UpdateFeedbackInputDto } from './dto/update-feedback-input.dto'

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackHttpController {
  constructor(
    @Inject(FeedbackTypeormRepository)
    private readonly repository: FeedbackTypeormRepository,
    private readonly jwtTokenService: JwtTokenService,
    @Inject(AUTH_REPOSITORY_PORT)
    private readonly authRepository: AuthRepositoryPort,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Submit product feedback (auth optional — anonymous for local mode)',
  })
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: FeedbackResponseDto })
  async create(@Req() request: Request, @Body() dto: CreateFeedbackInputDto) {
    const user = await this.resolveOptionalUser(request)
    return this.repository.create({
      id: dto.id,
      userId: user?.id ?? null,
      category: dto.category,
      message: dto.message,
      rating: dto.rating,
      clientMeta: dto.clientMeta ?? {},
    })
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own feedback (authenticated)' })
  @ApiOkResponse({ type: FeedbackResponseDto, isArray: true })
  async list(@CurrentUser() user: User) {
    const items = await this.repository.listByUser(user.id)
    return { items }
  }

  @Get('inbox')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all feedback (admin)' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1, minimum: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FEEDBACK_STATUSES })
  @ApiQuery({ name: 'priority', required: false, enum: FEEDBACK_PRIORITIES })
  @ApiQuery({ name: 'category', required: false, enum: FEEDBACK_CATEGORIES })
  @ApiQuery({ name: 'sort', required: false, enum: FEEDBACK_INBOX_SORTS, schema: { default: 'default' } })
  @ApiQuery({ name: 'order', required: false, enum: FEEDBACK_INBOX_ORDERS, schema: { default: 'desc' } })
  @ApiOkResponse({ type: FeedbackResponseDto, isArray: true })
  async inbox(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('sort') sort = 'default',
    @Query('order') order = 'desc',
  ) {
    return this.repository.listInbox({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      q: q?.trim() || undefined,
      status: this.pickEnum(status, FEEDBACK_STATUSES),
      priority: this.pickEnum(priority, FEEDBACK_PRIORITIES),
      category: this.pickEnum(category, FEEDBACK_CATEGORIES),
      sort: this.pickEnum(sort, FEEDBACK_INBOX_SORTS) ?? 'default',
      order: this.pickEnum(order, FEEDBACK_INBOX_ORDERS) ?? 'desc',
    })
  }

  @Patch(':id/resolve')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark feedback as resolved (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: FeedbackResponseDto })
  async resolve(@Param('id', ParseUUIDPipe) id: string) {
    const item = await this.repository.setStatus(id, 'resolved')
    if (!item) throw new NotFoundException('Feedback not found')
    return item
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update feedback status or priority (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: FeedbackResponseDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFeedbackInputDto) {
    if (dto.status === undefined && dto.priority === undefined) {
      throw new BadRequestException('Укажите status или priority')
    }
    const item = await this.repository.update(id, {
      status: dto.status,
      priority: dto.priority,
    })
    if (!item) throw new NotFoundException('Feedback not found')
    return item
  }

  @Delete(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete resolved feedback (admin)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.repository.deleteResolved(id)
    if (result === 'not_found') throw new NotFoundException('Feedback not found')
    if (result === 'not_resolved') {
      throw new BadRequestException('Удалить можно только решённые сообщения')
    }
    return { deleted: true }
  }

  private async resolveOptionalUser(request: Request): Promise<User | null> {
    const token = this.extractToken(request)
    if (!token) return null
    try {
      const payload = this.jwtTokenService.verify(token)
      return (await this.authRepository.findUserById(payload.sub)) ?? null
    } catch {
      return null
    }
  }

  private pickEnum<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
    if (!value) return undefined
    return (allowed as readonly string[]).includes(value) ? (value as T) : undefined
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization
    if (header?.startsWith('Bearer ')) {
      return header.slice(7)
    }

    const cookieHeader = request.headers.cookie
    if (cookieHeader) {
      const match = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('access_token='))
      if (match) {
        return decodeURIComponent(match.slice('access_token='.length))
      }
    }

    return null
  }
}

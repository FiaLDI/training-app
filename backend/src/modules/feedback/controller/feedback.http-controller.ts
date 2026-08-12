import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Request } from 'express'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import {
  AUTH_REPOSITORY_PORT,
  AuthRepositoryPort,
} from '../../auth/core/ports/auth-repository.port'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { JwtTokenService } from '../../auth/infrastructure/jwt-token.service'
import { FeedbackTypeormRepository } from '../infrastructure/feedback.typeorm-repository'
import { CreateFeedbackInputDto } from './dto/create-feedback-input.dto'
import { FeedbackResponseDto } from './dto/feedback-response.dto'

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

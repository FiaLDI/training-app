import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { RateLimit } from '../../../shared/rate-limit/rate-limit.decorator'
import { RateLimitGuard } from '../../../shared/rate-limit/rate-limit.guard'
import { ShareService } from '../core/share.service'
import {
  CreateShareResponseDto,
  GetShareQueryDto,
  ImportShareResponseDto,
  PublicShareResponseDto,
} from './dto/share.dto'

@ApiTags('share')
@Controller('share')
export class ShareHttpController {
  constructor(@Inject(ShareService) private readonly share: ShareService) {}

  @Get('resource')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active share link for my template or program' })
  @ApiOkResponse({ type: CreateShareResponseDto })
  async getMine(@CurrentUser() user: User, @Query() query: GetShareQueryDto) {
    return this.share.getMine(user.id, query.resourceType, query.resourceId)
  }

  @Post('templates/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or reuse a public share link for a template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CreateShareResponseDto })
  async shareTemplate(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.share.createTemplateLink(user.id, id)
  }

  @Post('programs/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or reuse a public share link for a program' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: CreateShareResponseDto })
  async shareProgram(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.share.createProgramLink(user.id, id)
  }

  @Get(':token')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 60, windowSeconds: 60, name: 'share-public' })
  @ApiOperation({ summary: 'Read a shared template or program (public)' })
  @ApiOkResponse({ type: PublicShareResponseDto })
  async getPublic(@Param('token') token: string) {
    return this.share.getPublic(token)
  }

  @Delete(':token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a share link' })
  async revoke(@CurrentUser() user: User, @Param('token') token: string) {
    await this.share.revoke(user.id, token)
    return { revoked: true }
  }

  @Post(':token/import')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy a shared template or program into my account' })
  @ApiOkResponse({ type: ImportShareResponseDto })
  async importShare(@CurrentUser() user: User, @Param('token') token: string) {
    const result = await this.share.importForUser(user.id, token)
    return {
      programId: result.program?.id,
      templateId: result.template?.id,
      skippedExercises: result.skippedExercises,
    }
  }
}

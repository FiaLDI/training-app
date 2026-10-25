import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { StatsCacheService } from '../../../shared/stats/stats-cache.service'
import { SyncStateResponseDto } from './sync-state-response.dto'

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sync')
export class SyncHttpController {
  constructor(private readonly statsCache: StatsCacheService) {}

  @Get('state')
  @ApiOperation({ summary: 'Collection generations for cheap client sync checks' })
  @ApiOkResponse({ type: SyncStateResponseDto })
  getState(@CurrentUser() user: User): Promise<SyncStateResponseDto> {
    return this.statsCache.getSyncState(user.id)
  }
}

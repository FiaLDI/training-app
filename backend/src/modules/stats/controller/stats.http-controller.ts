import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { GetExerciseProgressUseCase } from '../core/use-cases/exercise-progress/get-exercise-progress.use-case'
import { GetVolumeStatsUseCase } from '../core/use-cases/volume/get-volume-stats.use-case'

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('stats')
export class StatsHttpController {
  constructor(
    @Inject(GetVolumeStatsUseCase) private readonly volumeUseCase: GetVolumeStatsUseCase,
    @Inject(GetExerciseProgressUseCase)
    private readonly progressUseCase: GetExerciseProgressUseCase,
  ) {}

  @Get('volume')
  @ApiOperation({ summary: 'Training volume over time (excludes warm-up exercises)' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async volume(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.volumeUseCase.execute({ userId: user.id, from, to })
  }

  @Get('exercise-progress')
  @ApiOperation({ summary: 'Exercise progress over time (excludes warm-up exercises)' })
  @ApiQuery({ name: 'exerciseId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async progress(
    @CurrentUser() user: User,
    @Query('exerciseId') exerciseId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.progressUseCase.execute({
      userId: user.id,
      exerciseId,
      from,
      to,
    })
  }
}

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
import { GetActivityStatsUseCase } from '../core/use-cases/activity/get-activity-stats.use-case'
import { GetStrengthCorrelationUseCase } from '../core/use-cases/correlation/get-strength-correlation.use-case'
import { GetExerciseProgressUseCase } from '../core/use-cases/exercise-progress/get-exercise-progress.use-case'
import { GetMuscleGroupStatsUseCase } from '../core/use-cases/muscle-groups/get-muscle-group-stats.use-case'
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
    @Inject(GetMuscleGroupStatsUseCase)
    private readonly muscleGroupsUseCase: GetMuscleGroupStatsUseCase,
    @Inject(GetActivityStatsUseCase) private readonly activityUseCase: GetActivityStatsUseCase,
    @Inject(GetStrengthCorrelationUseCase)
    private readonly correlationUseCase: GetStrengthCorrelationUseCase,
  ) {}

  @Get('volume')
  @ApiOperation({ summary: 'Training volume over time (excludes warm-up sets)' })
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
  @ApiOperation({ summary: 'Exercise progress over time (excludes warm-up sets)' })
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

  @Get('muscle-groups')
  @ApiOperation({ summary: 'Volume and sets by muscle group for a period' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async muscleGroups(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.muscleGroupsUseCase.execute({ userId: user.id, from, to })
  }

  @Get('activity')
  @ApiOperation({ summary: 'Daily training activity (sessions + volume)' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async activity(
    @CurrentUser() user: User,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.activityUseCase.execute({ userId: user.id, from, to })
  }

  @Get('strength-correlation')
  @ApiOperation({ summary: 'Body weight vs exercise strength over time' })
  @ApiQuery({ name: 'exerciseId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async strengthCorrelation(
    @CurrentUser() user: User,
    @Query('exerciseId') exerciseId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.correlationUseCase.execute({
      userId: user.id,
      exerciseId,
      from,
      to,
    })
  }
}

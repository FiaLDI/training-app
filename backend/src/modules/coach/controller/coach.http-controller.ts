import {
  Body,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CoachService } from '../core/coach.service'
import {
  AddSetCommentInputDto,
  AssignProgramInputDto,
  JoinCoachInputDto,
} from './dto/coach.dto'

@ApiTags('coach')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('coach')
export class CoachHttpController {
  constructor(@Inject(CoachService) private readonly coach: CoachService) {}

  @Post('invites')
  @ApiOperation({ summary: 'Create a reusable trainee invite code' })
  async createInvite(@CurrentUser() user: User) {
    return this.coach.createInvite(user.id)
  }

  @Get('invites')
  @ApiOperation({ summary: 'List my active invite codes' })
  async listInvites(@CurrentUser() user: User) {
    const items = await this.coach.listInvites(user.id)
    return { items }
  }

  @Delete('invites/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  async revokeInvite(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.coach.revokeInvite(user.id, id)
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a coach with an invite code' })
  async join(@CurrentUser() user: User, @Body() dto: JoinCoachInputDto) {
    return this.coach.join(user.id, dto.code)
  }

  @Get('trainees')
  @ApiOperation({ summary: 'List my trainees' })
  async listTrainees(@CurrentUser() user: User) {
    const items = await this.coach.listTrainees(user.id)
    return { items }
  }

  @Get('coaches')
  @ApiOperation({ summary: 'List coaches I joined' })
  async listCoaches(@CurrentUser() user: User) {
    const items = await this.coach.listCoaches(user.id)
    return { items }
  }

  @Delete('relationships/:id')
  @ApiParam({ name: 'id', format: 'uuid' })
  async endRelationship(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.coach.endRelationship(user.id, id)
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Clone one of my programs onto a trainee' })
  async assign(@CurrentUser() user: User, @Body() dto: AssignProgramInputDto) {
    return this.coach.assignProgram(user.id, dto.traineeId, dto.programId, dto.weekStart)
  }

  @Get('trainees/:id/assignments')
  @ApiParam({ name: 'id', format: 'uuid' })
  async listAssignments(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const items = await this.coach.listAssignments(user.id, id)
    return { items }
  }

  @Get('trainees/:id/trainings')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async listTrainings(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.coach.listTraineeTrainings(user.id, id, from, to)
  }

  @Get('trainees/:id/trainings/:trainingId')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'trainingId', format: 'uuid' })
  async getTraining(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('trainingId', ParseUUIDPipe) trainingId: string,
  ) {
    return this.coach.getTraineeTraining(user.id, id, trainingId)
  }

  @Get('comments')
  @ApiQuery({ name: 'trainingId', required: true })
  @ApiOkResponse({ schema: { type: 'object' } })
  async listComments(@CurrentUser() user: User, @Query('trainingId') trainingId: string) {
    const items = await this.coach.listComments(user.id, trainingId)
    return { items }
  }

  @Post('sets/:setId/comments')
  @ApiParam({ name: 'setId', format: 'uuid' })
  async addComment(
    @CurrentUser() user: User,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body() dto: AddSetCommentInputDto,
  ) {
    return this.coach.addComment(user.id, setId, dto.body)
  }
}

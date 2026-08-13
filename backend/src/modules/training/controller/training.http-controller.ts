import {
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

import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { CreateTrainingUseCase } from '../core/use-cases/create/create-training.use-case'
import { CreateTrainingExerciseUseCase } from '../core/use-cases/create-exercise/create-training-exercise.use-case'
import { CreateTrainingSetUseCase } from '../core/use-cases/create-set/create-training-set.use-case'
import { DeleteTrainingUseCase } from '../core/use-cases/delete/delete-training.use-case'
import { DeleteTrainingExerciseUseCase } from '../core/use-cases/delete-exercise/delete-training-exercise.use-case'
import { DeleteTrainingSetUseCase } from '../core/use-cases/delete-set/delete-training-set.use-case'
import { GetTrainingUseCase } from '../core/use-cases/get/get-training.use-case'
import { ListTrainingsUseCase } from '../core/use-cases/list/list-trainings.use-case'
import { UpdateTrainingUseCase } from '../core/use-cases/update/update-training.use-case'
import { UpdateTrainingExerciseUseCase } from '../core/use-cases/update-exercise/update-training-exercise.use-case'
import { UpdateTrainingSetUseCase } from '../core/use-cases/update-set/update-training-set.use-case'
import { TrainingStatus } from '../core/types'
import { CreateTrainingExerciseInputDto } from './dto/create-training-exercise-input.dto'
import { CreateTrainingInputDto } from './dto/create-training-input.dto'
import { CreateTrainingSetInputDto } from './dto/create-training-set-input.dto'
import {
  TrainingExerciseResponseDto,
  TrainingResponseDto,
  TrainingSetResponseDto,
} from './dto/training-response.dto'
import { UpdateTrainingExerciseInputDto } from './dto/update-training-exercise-input.dto'
import { UpdateTrainingInputDto } from './dto/update-training-input.dto'
import { UpdateTrainingSetInputDto } from './dto/update-training-set-input.dto'

@ApiTags('trainings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('trainings')
export class TrainingHttpController {
  constructor(
    @Inject(ListTrainingsUseCase) private readonly listUseCase: ListTrainingsUseCase,
    @Inject(GetTrainingUseCase) private readonly getUseCase: GetTrainingUseCase,
    @Inject(CreateTrainingUseCase) private readonly createUseCase: CreateTrainingUseCase,
    @Inject(UpdateTrainingUseCase) private readonly updateUseCase: UpdateTrainingUseCase,
    @Inject(DeleteTrainingUseCase) private readonly deleteUseCase: DeleteTrainingUseCase,
    @Inject(CreateTrainingExerciseUseCase)
    private readonly createExerciseUseCase: CreateTrainingExerciseUseCase,
    @Inject(UpdateTrainingExerciseUseCase)
    private readonly updateExerciseUseCase: UpdateTrainingExerciseUseCase,
    @Inject(DeleteTrainingExerciseUseCase)
    private readonly deleteExerciseUseCase: DeleteTrainingExerciseUseCase,
    @Inject(CreateTrainingSetUseCase) private readonly createSetUseCase: CreateTrainingSetUseCase,
    @Inject(UpdateTrainingSetUseCase) private readonly updateSetUseCase: UpdateTrainingSetUseCase,
    @Inject(DeleteTrainingSetUseCase) private readonly deleteSetUseCase: DeleteTrainingSetUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List trainings' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['planned', 'in_progress', 'finished', 'cancelled'],
  })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date lower bound' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO date upper bound' })
  async list(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: TrainingStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.listUseCase.execute({
      userId: user.id,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      status,
      from,
      to,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get training with exercises and sets' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TrainingResponseDto })
  async getById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id, userId: user.id })
    if (!result.training) throw new NotFoundException('Training not found')
    return result.training
  }

  @Post()
  @ApiOperation({ summary: 'Create training' })
  @ApiCreatedResponse({ type: TrainingResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateTrainingInputDto) {
    const result = await this.createUseCase.execute({ ...dto, userId: user.id })
    return result.training
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update training' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TrainingResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainingInputDto,
  ) {
    const result = await this.updateUseCase.execute({ id, userId: user.id, ...dto })
    if (!result.training) throw new NotFoundException('Training not found')
    return result.training
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete training' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Training not found')
    return result
  }

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Add exercise to training' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: TrainingExerciseResponseDto })
  async createExercise(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTrainingExerciseInputDto,
  ) {
    const result = await this.createExerciseUseCase.execute({
      trainingId: id,
      userId: user.id,
      ...dto,
    })
    if (!result.exercise) throw new NotFoundException('Training not found')
    return result.exercise
  }

  @Patch('exercises/:exerciseId')
  @ApiOperation({ summary: 'Update training exercise' })
  @ApiParam({ name: 'exerciseId', format: 'uuid' })
  @ApiOkResponse({ type: TrainingExerciseResponseDto })
  async updateExercise(
    @CurrentUser() user: User,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: UpdateTrainingExerciseInputDto,
  ) {
    const { exerciseId: _ignoredCatalogExerciseId, ...patch } = dto
    const result = await this.updateExerciseUseCase.execute({
      id: exerciseId,
      userId: user.id,
      ...patch,
    })
    if (!result.exercise) throw new NotFoundException('Training exercise not found')
    return result.exercise
  }

  @Delete('exercises/:exerciseId')
  @ApiOperation({ summary: 'Remove exercise from training' })
  @ApiParam({ name: 'exerciseId', format: 'uuid' })
  async removeExercise(
    @CurrentUser() user: User,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const result = await this.deleteExerciseUseCase.execute({ id: exerciseId, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Training exercise not found')
    return result
  }

  @Post('exercises/:exerciseId/sets')
  @ApiOperation({ summary: 'Add set to training exercise' })
  @ApiParam({ name: 'exerciseId', format: 'uuid' })
  @ApiCreatedResponse({ type: TrainingSetResponseDto })
  async createSet(
    @CurrentUser() user: User,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: CreateTrainingSetInputDto,
  ) {
    const result = await this.createSetUseCase.execute({
      trainingExerciseId: exerciseId,
      userId: user.id,
      ...dto,
    })
    if (!result.set) throw new NotFoundException('Training exercise not found')
    return result.set
  }

  @Patch('sets/:setId')
  @ApiOperation({ summary: 'Update training set' })
  @ApiParam({ name: 'setId', format: 'uuid' })
  @ApiOkResponse({ type: TrainingSetResponseDto })
  async updateSet(
    @CurrentUser() user: User,
    @Param('setId', ParseUUIDPipe) setId: string,
    @Body() dto: UpdateTrainingSetInputDto,
  ) {
    const result = await this.updateSetUseCase.execute({ id: setId, userId: user.id, ...dto })
    if (!result.set) throw new NotFoundException('Training set not found')
    return result.set
  }

  @Delete('sets/:setId')
  @ApiOperation({ summary: 'Delete training set' })
  @ApiParam({ name: 'setId', format: 'uuid' })
  async removeSet(@CurrentUser() user: User, @Param('setId', ParseUUIDPipe) setId: string) {
    const result = await this.deleteSetUseCase.execute({ id: setId, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Training set not found')
    return result
  }
}

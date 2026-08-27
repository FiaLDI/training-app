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

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { CreateExerciseUseCase } from '../core/use-cases/create/create-exercise.use-case'
import { DeleteExerciseUseCase } from '../core/use-cases/delete/delete-exercise.use-case'
import { GetExerciseUseCase } from '../core/use-cases/get/get-exercise.use-case'
import { ListExercisesUseCase } from '../core/use-cases/list/list-exercises.use-case'
import { UpdateExerciseUseCase } from '../core/use-cases/update/update-exercise.use-case'
import { CreateExerciseInputDto } from './dto/create-exercise-input.dto'
import { ExerciseResponseDto } from './dto/exercise-response.dto'
import { UpdateExerciseInputDto } from './dto/update-exercise-input.dto'

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('exercises')
export class ExerciseHttpController {
  constructor(
    @Inject(ListExercisesUseCase) private readonly listUseCase: ListExercisesUseCase,
    @Inject(GetExerciseUseCase) private readonly getUseCase: GetExerciseUseCase,
    @Inject(CreateExerciseUseCase) private readonly createUseCase: CreateExerciseUseCase,
    @Inject(UpdateExerciseUseCase) private readonly updateUseCase: UpdateExerciseUseCase,
    @Inject(DeleteExerciseUseCase) private readonly deleteUseCase: DeleteExerciseUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List system + own custom exercises' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1, minimum: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string' } })
  @ApiOkResponse({ type: ExerciseResponseDto, isArray: true })
  async list(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
  ) {
    return this.listUseCase.execute({
      userId: user.id,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      q,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exercise by ID (system or own)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExerciseResponseDto })
  async getById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id, userId: user.id })
    if (!result.exercise) {
      throw new NotFoundException('Exercise not found')
    }
    return result.exercise
  }

  @Post()
  @ApiOperation({ summary: 'Create custom exercise (or system if admin + isSystem)' })
  @ApiCreatedResponse({ type: ExerciseResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateExerciseInputDto) {
    const isSystem = user.role === 'admin' && dto.isSystem === true
    const result = await this.createUseCase.execute({
      id: dto.id,
      userId: isSystem ? null : user.id,
      name: dto.name,
      description: dto.description,
      muscleGroup: dto.muscleGroup,
      difficulty: dto.difficulty,
      metadata: dto.metadata,
    })
    return result.exercise
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update exercise (owner or admin for system; admin may set isSystem to promote)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExerciseResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseInputDto,
  ) {
    const result = await this.updateUseCase.execute({
      id,
      userId: user.id,
      role: user.role,
      ...dto,
    })
    if (!result.exercise) {
      throw new NotFoundException('Exercise not found')
    }
    return result.exercise
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete exercise (owner or admin for system)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } })
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({
      id,
      userId: user.id,
      role: user.role,
    })
    if (!result.deleted) {
      throw new NotFoundException('Exercise not found')
    }
    return result
  }
}

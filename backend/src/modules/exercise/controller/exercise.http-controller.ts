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
} from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { CreateExerciseUseCase } from '../core/use-cases/create/create-exercise.use-case'
import { DeleteExerciseUseCase } from '../core/use-cases/delete/delete-exercise.use-case'
import { GetExerciseUseCase } from '../core/use-cases/get/get-exercise.use-case'
import { ListExercisesUseCase } from '../core/use-cases/list/list-exercises.use-case'
import { UpdateExerciseUseCase } from '../core/use-cases/update/update-exercise.use-case'
import { CreateExerciseInputDto } from './dto/create-exercise-input.dto'
import { ExerciseResponseDto } from './dto/exercise-response.dto'
import { UpdateExerciseInputDto } from './dto/update-exercise-input.dto'

@ApiTags('exercises')
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
  @ApiOperation({ summary: 'List exercises' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1, minimum: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } })
  @ApiQuery({ name: 'q', required: false, schema: { type: 'string' } })
  @ApiOkResponse({ type: ExerciseResponseDto, isArray: true })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
  ) {
    return this.listUseCase.execute({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      q,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exercise by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExerciseResponseDto })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id })
    if (!result.exercise) {
      throw new NotFoundException('Exercise not found')
    }
    return result.exercise
  }

  @Post()
  @ApiOperation({ summary: 'Create exercise' })
  @ApiCreatedResponse({ type: ExerciseResponseDto })
  async create(@Body() dto: CreateExerciseInputDto) {
    const result = await this.createUseCase.execute(dto)
    return result.exercise
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exercise' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExerciseResponseDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExerciseInputDto) {
    const result = await this.updateUseCase.execute({ id, ...dto })
    if (!result.exercise) {
      throw new NotFoundException('Exercise not found')
    }
    return result.exercise
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete exercise' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id })
    if (!result.deleted) {
      throw new NotFoundException('Exercise not found')
    }
    return result
  }
}

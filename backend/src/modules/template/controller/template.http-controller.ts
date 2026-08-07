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
import { CreateTemplateUseCase } from '../core/use-cases/create/create-template.use-case'
import { CreateTemplateExerciseUseCase } from '../core/use-cases/create-exercise/create-template-exercise.use-case'
import { DeleteTemplateUseCase } from '../core/use-cases/delete/delete-template.use-case'
import { DeleteTemplateExerciseUseCase } from '../core/use-cases/delete-exercise/delete-template-exercise.use-case'
import { GetTemplateUseCase } from '../core/use-cases/get/get-template.use-case'
import { ListTemplatesUseCase } from '../core/use-cases/list/list-templates.use-case'
import { UpdateTemplateUseCase } from '../core/use-cases/update/update-template.use-case'
import { UpdateTemplateExerciseUseCase } from '../core/use-cases/update-exercise/update-template-exercise.use-case'
import { CreateTemplateExerciseInputDto } from './dto/create-template-exercise-input.dto'
import { CreateTemplateInputDto } from './dto/create-template-input.dto'
import { TemplateExerciseResponseDto, TemplateResponseDto } from './dto/template-response.dto'
import { UpdateTemplateExerciseInputDto } from './dto/update-template-exercise-input.dto'
import { UpdateTemplateInputDto } from './dto/update-template-input.dto'

@ApiTags('templates')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('templates')
export class TemplateHttpController {
  constructor(
    @Inject(ListTemplatesUseCase) private readonly listUseCase: ListTemplatesUseCase,
    @Inject(GetTemplateUseCase) private readonly getUseCase: GetTemplateUseCase,
    @Inject(CreateTemplateUseCase) private readonly createUseCase: CreateTemplateUseCase,
    @Inject(UpdateTemplateUseCase) private readonly updateUseCase: UpdateTemplateUseCase,
    @Inject(DeleteTemplateUseCase) private readonly deleteUseCase: DeleteTemplateUseCase,
    @Inject(CreateTemplateExerciseUseCase)
    private readonly createExerciseUseCase: CreateTemplateExerciseUseCase,
    @Inject(UpdateTemplateExerciseUseCase)
    private readonly updateExerciseUseCase: UpdateTemplateExerciseUseCase,
    @Inject(DeleteTemplateExerciseUseCase)
    private readonly deleteExerciseUseCase: DeleteTemplateExerciseUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List workout templates' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiQuery({ name: 'q', required: false })
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
  @ApiOperation({ summary: 'Get template with exercises' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TemplateResponseDto })
  async getById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id, userId: user.id })
    if (!result.template) throw new NotFoundException('Template not found')
    return result.template
  }

  @Post()
  @ApiOperation({ summary: 'Create template' })
  @ApiCreatedResponse({ type: TemplateResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateTemplateInputDto) {
    const result = await this.createUseCase.execute({ ...dto, userId: user.id })
    return result.template
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TemplateResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateInputDto,
  ) {
    const result = await this.updateUseCase.execute({ id, userId: user.id, ...dto })
    if (!result.template) throw new NotFoundException('Template not found')
    return result.template
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Template not found')
    return result
  }

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Add exercise to template' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: TemplateExerciseResponseDto })
  async createExercise(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTemplateExerciseInputDto,
  ) {
    const result = await this.createExerciseUseCase.execute({
      templateId: id,
      userId: user.id,
      ...dto,
    })
    if (!result.exercise) throw new NotFoundException('Template not found')
    return result.exercise
  }

  @Patch('exercises/:exerciseId')
  @ApiOperation({ summary: 'Update template exercise' })
  @ApiParam({ name: 'exerciseId', format: 'uuid' })
  @ApiOkResponse({ type: TemplateExerciseResponseDto })
  async updateExercise(
    @CurrentUser() user: User,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
    @Body() dto: UpdateTemplateExerciseInputDto,
  ) {
    const result = await this.updateExerciseUseCase.execute({
      id: exerciseId,
      userId: user.id,
      ...dto,
    })
    if (!result.exercise) throw new NotFoundException('Template exercise not found')
    return result.exercise
  }

  @Delete('exercises/:exerciseId')
  @ApiOperation({ summary: 'Remove exercise from template' })
  @ApiParam({ name: 'exerciseId', format: 'uuid' })
  async removeExercise(
    @CurrentUser() user: User,
    @Param('exerciseId', ParseUUIDPipe) exerciseId: string,
  ) {
    const result = await this.deleteExerciseUseCase.execute({ id: exerciseId, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Template exercise not found')
    return result
  }
}

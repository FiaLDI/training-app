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
import { ApplyProgramUseCase } from '../core/use-cases/apply/apply-program.use-case'
import { CreateProgramUseCase } from '../core/use-cases/create/create-program.use-case'
import { CreateProgramDayUseCase } from '../core/use-cases/create-day/create-program-day.use-case'
import { DeleteProgramUseCase } from '../core/use-cases/delete/delete-program.use-case'
import { DeleteProgramDayUseCase } from '../core/use-cases/delete-day/delete-program-day.use-case'
import { GetProgramUseCase } from '../core/use-cases/get/get-program.use-case'
import { ListProgramsUseCase } from '../core/use-cases/list/list-programs.use-case'
import { UpdateProgramUseCase } from '../core/use-cases/update/update-program.use-case'
import { UpdateProgramDayUseCase } from '../core/use-cases/update-day/update-program-day.use-case'
import { ApplyProgramInputDto } from './dto/apply-program-input.dto'
import { CreateProgramDayInputDto } from './dto/create-program-day-input.dto'
import { CreateProgramInputDto } from './dto/create-program-input.dto'
import { ProgramDayResponseDto, ProgramResponseDto } from './dto/program-response.dto'
import { UpdateProgramDayInputDto } from './dto/update-program-day-input.dto'
import { UpdateProgramInputDto } from './dto/update-program-input.dto'

@ApiTags('programs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('programs')
export class ProgramHttpController {
  constructor(
    @Inject(ListProgramsUseCase) private readonly listUseCase: ListProgramsUseCase,
    @Inject(GetProgramUseCase) private readonly getUseCase: GetProgramUseCase,
    @Inject(CreateProgramUseCase) private readonly createUseCase: CreateProgramUseCase,
    @Inject(UpdateProgramUseCase) private readonly updateUseCase: UpdateProgramUseCase,
    @Inject(DeleteProgramUseCase) private readonly deleteUseCase: DeleteProgramUseCase,
    @Inject(CreateProgramDayUseCase) private readonly createDayUseCase: CreateProgramDayUseCase,
    @Inject(UpdateProgramDayUseCase) private readonly updateDayUseCase: UpdateProgramDayUseCase,
    @Inject(DeleteProgramDayUseCase) private readonly deleteDayUseCase: DeleteProgramDayUseCase,
    @Inject(ApplyProgramUseCase) private readonly applyUseCase: ApplyProgramUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List programs' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  async list(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.listUseCase.execute({
      userId: user.id,
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program with days' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProgramResponseDto })
  async getById(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id, userId: user.id })
    if (!result.program) throw new NotFoundException('Program not found')
    return result.program
  }

  @Post()
  @ApiOperation({ summary: 'Create program' })
  @ApiCreatedResponse({ type: ProgramResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateProgramInputDto) {
    const result = await this.createUseCase.execute({ ...dto, userId: user.id })
    return result.program
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update program' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ProgramResponseDto })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramInputDto,
  ) {
    const result = await this.updateUseCase.execute({ id, userId: user.id, ...dto })
    if (!result.program) throw new NotFoundException('Program not found')
    return result.program
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete program' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Program not found')
    return result
  }

  @Post(':id/days')
  @ApiOperation({ summary: 'Add day slot to program' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: ProgramDayResponseDto })
  async createDay(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProgramDayInputDto,
  ) {
    const result = await this.createDayUseCase.execute({
      programId: id,
      userId: user.id,
      ...dto,
    })
    if (!result.day) throw new NotFoundException('Program not found')
    return result.day
  }

  @Patch('days/:dayId')
  @ApiOperation({ summary: 'Update program day' })
  @ApiParam({ name: 'dayId', format: 'uuid' })
  @ApiOkResponse({ type: ProgramDayResponseDto })
  async updateDay(
    @CurrentUser() user: User,
    @Param('dayId', ParseUUIDPipe) dayId: string,
    @Body() dto: UpdateProgramDayInputDto,
  ) {
    const result = await this.updateDayUseCase.execute({
      id: dayId,
      userId: user.id,
      ...dto,
    })
    if (!result.day) throw new NotFoundException('Program day not found')
    return result.day
  }

  @Delete('days/:dayId')
  @ApiOperation({ summary: 'Remove program day' })
  @ApiParam({ name: 'dayId', format: 'uuid' })
  async removeDay(@CurrentUser() user: User, @Param('dayId', ParseUUIDPipe) dayId: string) {
    const result = await this.deleteDayUseCase.execute({ id: dayId, userId: user.id })
    if (!result.deleted) throw new NotFoundException('Program day not found')
    return result
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Materialize program as planned trainings for a week' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async apply(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyProgramInputDto,
  ) {
    return this.applyUseCase.execute({
      id,
      userId: user.id,
      weekStart: dto.weekStart,
    })
  }
}

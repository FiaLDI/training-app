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

import { CreateSourceUseCase } from '../core/use-cases/create/create-source.use-case'
import { CreateTimecodeUseCase } from '../core/use-cases/create-timecode/create-timecode.use-case'
import { DeleteSourceUseCase } from '../core/use-cases/delete/delete-source.use-case'
import { DeleteTimecodeUseCase } from '../core/use-cases/delete-timecode/delete-timecode.use-case'
import { GetSourceUseCase } from '../core/use-cases/get/get-source.use-case'
import { ListSourcesUseCase } from '../core/use-cases/list/list-sources.use-case'
import { ListTimecodesUseCase } from '../core/use-cases/list-timecodes/list-timecodes.use-case'
import { UpdateSourceUseCase } from '../core/use-cases/update/update-source.use-case'
import { UpdateTimecodeUseCase } from '../core/use-cases/update-timecode/update-timecode.use-case'
import { CreateSourceInputDto } from './dto/create-source-input.dto'
import { CreateTimecodeInputDto } from './dto/create-timecode-input.dto'
import { SourceResponseDto, TimecodeResponseDto } from './dto/source-response.dto'
import { UpdateSourceInputDto } from './dto/update-source-input.dto'
import { UpdateTimecodeInputDto } from './dto/update-timecode-input.dto'

@ApiTags('sources')
@Controller('sources')
export class SourceHttpController {
  constructor(
    @Inject(ListSourcesUseCase) private readonly listUseCase: ListSourcesUseCase,
    @Inject(GetSourceUseCase) private readonly getUseCase: GetSourceUseCase,
    @Inject(CreateSourceUseCase) private readonly createUseCase: CreateSourceUseCase,
    @Inject(UpdateSourceUseCase) private readonly updateUseCase: UpdateSourceUseCase,
    @Inject(DeleteSourceUseCase) private readonly deleteUseCase: DeleteSourceUseCase,
    @Inject(ListTimecodesUseCase) private readonly listTimecodesUseCase: ListTimecodesUseCase,
    @Inject(CreateTimecodeUseCase) private readonly createTimecodeUseCase: CreateTimecodeUseCase,
    @Inject(UpdateTimecodeUseCase) private readonly updateTimecodeUseCase: UpdateTimecodeUseCase,
    @Inject(DeleteTimecodeUseCase) private readonly deleteTimecodeUseCase: DeleteTimecodeUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List exercise sources' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20 } })
  @ApiQuery({ name: 'exerciseId', required: false, schema: { type: 'string', format: 'uuid' } })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('exerciseId') exerciseId?: string,
  ) {
    return this.listUseCase.execute({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(100, Math.max(1, Number(limit) || 20)),
      exerciseId,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get source by ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SourceResponseDto })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getUseCase.execute({ id })
    if (!result.source) throw new NotFoundException('Source not found')
    return result.source
  }

  @Post()
  @ApiOperation({ summary: 'Create source' })
  @ApiCreatedResponse({ type: SourceResponseDto })
  async create(@Body() dto: CreateSourceInputDto) {
    const result = await this.createUseCase.execute(dto)
    return result.source
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update source' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: SourceResponseDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSourceInputDto) {
    const result = await this.updateUseCase.execute({ id, ...dto })
    if (!result.source) throw new NotFoundException('Source not found')
    return result.source
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete source' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id })
    if (!result.deleted) throw new NotFoundException('Source not found')
    return result
  }

  @Get(':id/timecodes')
  @ApiOperation({ summary: 'List timecodes for source' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: TimecodeResponseDto, isArray: true })
  async listTimecodes(@Param('id', ParseUUIDPipe) id: string) {
    const source = await this.getUseCase.execute({ id })
    if (!source.source) throw new NotFoundException('Source not found')
    return this.listTimecodesUseCase.execute({ sourceId: id })
  }

  @Post(':id/timecodes')
  @ApiOperation({ summary: 'Create timecode for source' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: TimecodeResponseDto })
  async createTimecode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTimecodeInputDto) {
    const source = await this.getUseCase.execute({ id })
    if (!source.source) throw new NotFoundException('Source not found')
    const result = await this.createTimecodeUseCase.execute({ sourceId: id, ...dto })
    return result.timecode
  }

  @Patch('timecodes/:timecodeId')
  @ApiOperation({ summary: 'Update timecode' })
  @ApiParam({ name: 'timecodeId', format: 'uuid' })
  @ApiOkResponse({ type: TimecodeResponseDto })
  async updateTimecode(
    @Param('timecodeId', ParseUUIDPipe) timecodeId: string,
    @Body() dto: UpdateTimecodeInputDto,
  ) {
    const result = await this.updateTimecodeUseCase.execute({ id: timecodeId, ...dto })
    if (!result.timecode) throw new NotFoundException('Timecode not found')
    return result.timecode
  }

  @Delete('timecodes/:timecodeId')
  @ApiOperation({ summary: 'Delete timecode' })
  @ApiParam({ name: 'timecodeId', format: 'uuid' })
  async removeTimecode(@Param('timecodeId', ParseUUIDPipe) timecodeId: string) {
    const result = await this.deleteTimecodeUseCase.execute({ id: timecodeId })
    if (!result.deleted) throw new NotFoundException('Timecode not found')
    return result
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
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

import { CreateEquipmentUseCase } from '../core/use-cases/create/create-equipment.use-case'
import { DeleteEquipmentUseCase } from '../core/use-cases/delete/delete-equipment.use-case'
import { ListEquipmentUseCase } from '../core/use-cases/list/list-equipment.use-case'
import { CreateEquipmentInputDto } from './dto/create-equipment-input.dto'
import { EquipmentResponseDto } from './dto/equipment-response.dto'

@ApiTags('equipment')
@Controller('equipment')
export class EquipmentHttpController {
  constructor(
    @Inject(ListEquipmentUseCase) private readonly listUseCase: ListEquipmentUseCase,
    @Inject(CreateEquipmentUseCase) private readonly createUseCase: CreateEquipmentUseCase,
    @Inject(DeleteEquipmentUseCase) private readonly deleteUseCase: DeleteEquipmentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List equipment' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1 } })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 100 } })
  @ApiQuery({ name: 'q', required: false })
  @ApiOkResponse({ type: EquipmentResponseDto, isArray: true })
  async list(
    @Query('page') page = 1,
    @Query('limit') limit = 100,
    @Query('q') q?: string,
  ) {
    return this.listUseCase.execute({
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(200, Math.max(1, Number(limit) || 100)),
      q,
    })
  }

  @Post()
  @ApiOperation({ summary: 'Create equipment' })
  @ApiCreatedResponse({ type: EquipmentResponseDto })
  async create(@Body() dto: CreateEquipmentInputDto) {
    const result = await this.createUseCase.execute(dto)
    return result.equipment
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete equipment' })
  @ApiParam({ name: 'id', format: 'uuid' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteUseCase.execute({ id })
    if (!result.deleted) throw new NotFoundException('Equipment not found')
    return result
  }
}

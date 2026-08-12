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
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger'

import { CurrentUser } from '../../auth/controller/current-user.decorator'
import { User } from '../../auth/core/types'
import { AuthGuard } from '../../auth/infrastructure/auth.guard'
import { BodyMeasurementTypeormRepository } from '../infrastructure/body-measurement.typeorm-repository'
import { BodyMeasurementResponseDto } from './dto/body-measurement-response.dto'
import { CreateBodyMeasurementInputDto } from './dto/create-body-measurement-input.dto'

@ApiTags('body-measurements')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('body-measurements')
export class BodyMeasurementHttpController {
  constructor(
    @Inject(BodyMeasurementTypeormRepository)
    private readonly repository: BodyMeasurementTypeormRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List body weight measurements' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiOkResponse({ type: BodyMeasurementResponseDto, isArray: true })
  async list(
    @CurrentUser() user: User,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const items = await this.repository.list(user.id, from, to)
    return { items }
  }

  @Post()
  @ApiOperation({ summary: 'Record body weight' })
  @ApiCreatedResponse({ type: BodyMeasurementResponseDto })
  async create(@CurrentUser() user: User, @Body() dto: CreateBodyMeasurementInputDto) {
    return this.repository.create({
      id: dto.id,
      userId: user.id,
      weight: dto.weight,
      measuredAt: dto.measuredAt,
      metadata: dto.metadata,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete body weight measurement' })
  @ApiOkResponse({ schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } })
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    const deleted = await this.repository.delete(user.id, id)
    if (!deleted) throw new NotFoundException('Measurement not found')
    return { deleted: true }
  }
}

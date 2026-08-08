import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ProgramDayResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  programId!: string

  @ApiProperty()
  dayOfWeek!: number

  @ApiProperty()
  slotOrder!: number

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  templateId!: string | null

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null
}

export class ProgramResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  userId!: string

  @ApiProperty()
  name!: string

  @ApiPropertyOptional({ nullable: true })
  description!: string | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string

  @ApiPropertyOptional({ type: [ProgramDayResponseDto] })
  days?: ProgramDayResponseDto[]
}

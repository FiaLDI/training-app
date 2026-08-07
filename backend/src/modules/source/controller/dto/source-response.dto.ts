import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  exerciseId!: string

  @ApiProperty()
  type!: string

  @ApiPropertyOptional({ nullable: true })
  title!: string | null

  @ApiProperty()
  url!: string

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string
}

export class TimecodeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  sourceId!: string

  @ApiProperty()
  seconds!: number

  @ApiPropertyOptional({ nullable: true })
  title!: string | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>
}

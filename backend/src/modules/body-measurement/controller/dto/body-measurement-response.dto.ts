import { ApiProperty } from '@nestjs/swagger'

export class BodyMeasurementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  userId!: string

  @ApiProperty({ nullable: true, example: 78.5 })
  weight!: number | null

  @ApiProperty()
  measuredAt!: string

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>
}

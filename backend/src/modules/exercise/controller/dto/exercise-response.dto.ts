import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null when isSystem' })
  userId!: string | null

  @ApiProperty({ description: 'Shared catalog exercise' })
  isSystem!: boolean

  @ApiProperty()
  name!: string

  @ApiPropertyOptional({ nullable: true })
  description!: string | null

  @ApiPropertyOptional({ nullable: true })
  muscleGroup!: string | null

  @ApiPropertyOptional({ nullable: true })
  difficulty!: string | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

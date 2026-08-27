import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null = system exercise' })
  userId!: string | null

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

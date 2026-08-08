import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TemplateExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  templateId!: string

  @ApiProperty({ format: 'uuid' })
  exerciseId!: string

  @ApiProperty()
  exerciseOrder!: number

  @ApiProperty()
  targetSets!: number

  @ApiProperty()
  isWarmup!: boolean

  @ApiPropertyOptional({ nullable: true })
  minReps!: number | null

  @ApiPropertyOptional({ nullable: true })
  maxReps!: number | null

  @ApiPropertyOptional({ nullable: true })
  targetWeight!: number | null

  @ApiPropertyOptional({ nullable: true })
  restSeconds!: number | null

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>
}

export class TemplateResponseDto {
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

  @ApiPropertyOptional({ type: [TemplateExerciseResponseDto] })
  exercises?: TemplateExerciseResponseDto[]
}

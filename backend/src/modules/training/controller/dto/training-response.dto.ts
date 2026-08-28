import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class TrainingSetResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  trainingExerciseId!: string

  @ApiProperty()
  setNumber!: number

  @ApiPropertyOptional({ nullable: true })
  weight!: number | null

  @ApiPropertyOptional({ nullable: true })
  reps!: number | null

  @ApiPropertyOptional({ nullable: true })
  rir!: number | null

  @ApiPropertyOptional({ nullable: true })
  rpe!: number | null

  @ApiProperty()
  completed!: boolean

  @ApiProperty()
  isWarmup!: boolean

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string
}

export class TrainingExerciseGroupResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  trainingId!: string

  @ApiProperty({ enum: ['superset', 'triset', 'circuit'] })
  type!: 'superset' | 'triset' | 'circuit'

  @ApiProperty()
  groupOrder!: number

  @ApiPropertyOptional({ nullable: true })
  restSeconds!: number | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>
}

export class TrainingExerciseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  trainingId!: string

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
  maxWeight!: number | null

  @ApiPropertyOptional({ nullable: true })
  previousMaxWeight!: number | null

  @ApiPropertyOptional({ nullable: true })
  restSeconds!: number | null

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  groupId!: string | null

  @ApiPropertyOptional({ nullable: true })
  positionInGroup!: number | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiPropertyOptional({ type: [TrainingSetResponseDto] })
  sets?: TrainingSetResponseDto[]
}

export class TrainingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  userId!: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  templateId!: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  programId!: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  programDayId!: string | null

  @ApiProperty({ enum: ['planned', 'in_progress', 'finished', 'cancelled'] })
  status!: string

  @ApiPropertyOptional({ nullable: true })
  scheduledAt!: string | null

  @ApiPropertyOptional({ nullable: true })
  startedAt!: string | null

  @ApiPropertyOptional({ nullable: true })
  finishedAt!: string | null

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiPropertyOptional({ type: [TrainingExerciseResponseDto] })
  exercises?: TrainingExerciseResponseDto[]

  @ApiPropertyOptional({ type: [TrainingExerciseGroupResponseDto] })
  groups?: TrainingExerciseGroupResponseDto[]
}

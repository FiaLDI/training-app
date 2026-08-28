import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator'

import { ExerciseGroupType } from '../../../../common/core/exercise-group'

export class CreateTemplateExerciseGroupInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  id?: string

  @ApiProperty({ type: [String], minItems: 2 })
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  exerciseIds!: string[]

  @ApiPropertyOptional({ enum: ['superset', 'triset', 'circuit'] })
  @IsOptional()
  @IsEnum(['superset', 'triset', 'circuit'] satisfies ExerciseGroupType[])
  type?: ExerciseGroupType

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number | null
}

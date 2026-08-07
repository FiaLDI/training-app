import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateExerciseInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  muscleGroup?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  equipment?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  difficulty?: string | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

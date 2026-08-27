import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsObject, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

export class CreateExerciseInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string

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
  difficulty?: string | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>

  /** Admin only: create a shared system exercise (user_id NULL). Ignored for non-admins. */
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean
}

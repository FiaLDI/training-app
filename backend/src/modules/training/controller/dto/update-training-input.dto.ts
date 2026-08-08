import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsIn, IsObject, IsOptional, IsString } from 'class-validator'

export class UpdateTrainingInputDto {
  @ApiPropertyOptional({ enum: ['planned', 'in_progress', 'finished', 'cancelled'] })
  @IsOptional()
  @IsIn(['planned', 'in_progress', 'finished', 'cancelled'])
  status?: 'planned' | 'in_progress' | 'finished' | 'cancelled'

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  startedAt?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  finishedAt?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

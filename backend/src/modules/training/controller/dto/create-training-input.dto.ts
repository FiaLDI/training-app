import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'

export class CreateTrainingInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  programId?: string | null

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  programDayId?: string | null

  @ApiProperty({ enum: ['planned', 'in_progress', 'finished', 'cancelled'] })
  @IsIn(['planned', 'in_progress', 'finished', 'cancelled'])
  status!: 'planned' | 'in_progress' | 'finished' | 'cancelled'

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

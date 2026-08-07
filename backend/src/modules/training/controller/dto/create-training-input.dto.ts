import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'

export class CreateTrainingInputDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string | null

  @ApiProperty({ enum: ['planned', 'in_progress', 'finished', 'cancelled'] })
  @IsIn(['planned', 'in_progress', 'finished', 'cancelled'])
  status!: 'planned' | 'in_progress' | 'finished' | 'cancelled'

  @ApiProperty()
  @IsDateString()
  startedAt!: string

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'

export class CreateFeedbackInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string

  @ApiProperty({ enum: ['bug', 'idea', 'other'] })
  @IsIn(['bug', 'idea', 'other'])
  category!: 'bug' | 'idea' | 'other'

  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string

  @ApiPropertyOptional({ minimum: 1, maximum: 5, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  clientMeta?: Record<string, unknown>
}

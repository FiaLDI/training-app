import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator'

export class UpdateTimecodeInputDto {
  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  seconds?: number

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

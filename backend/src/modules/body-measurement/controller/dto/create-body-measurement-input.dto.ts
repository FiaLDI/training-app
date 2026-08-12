import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class CreateBodyMeasurementInputDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  id?: string

  @ApiProperty({ minimum: 20, maximum: 500, example: 78.5 })
  @IsNumber()
  @Min(20)
  weight!: number

  @ApiPropertyOptional({ example: '2026-08-12T10:00:00.000Z' })
  @IsOptional()
  @IsString()
  measuredAt?: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

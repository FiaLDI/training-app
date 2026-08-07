import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator'

export class CreateTimecodeInputDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  seconds!: number

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

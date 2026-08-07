import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator'

export class UpdateSourceInputDto {
  @ApiPropertyOptional({ example: 'youtube' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  type?: string

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

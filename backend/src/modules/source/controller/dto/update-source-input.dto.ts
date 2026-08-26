import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator'

const SOURCE_URL_PATTERN =
  /^(https?:\/\/\S+|\/upload\/[A-Za-z0-9._-]+)$/

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

  @ApiPropertyOptional({
    example: '/upload/example.gif',
    description: 'Absolute URL or local upload path (/upload/...)',
  })
  @IsOptional()
  @IsString()
  @Matches(SOURCE_URL_PATTERN, {
    message: 'url must be http(s) URL or /upload/<filename>',
  })
  url?: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator'

const SOURCE_URL_PATTERN =
  /^(https?:\/\/\S+|\/upload\/[A-Za-z0-9._-]+)$/

export class CreateSourceInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  exerciseId!: string

  @ApiProperty({ example: 'youtube' })
  @IsString()
  @MinLength(1)
  type!: string

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null

  @ApiProperty({
    example: '/upload/example.gif',
    description: 'Absolute URL or local upload path (/upload/...)',
  })
  @IsString()
  @Matches(SOURCE_URL_PATTERN, {
    message: 'url must be http(s) URL or /upload/<filename>',
  })
  url!: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

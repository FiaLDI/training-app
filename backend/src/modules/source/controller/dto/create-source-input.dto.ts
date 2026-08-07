import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsObject, IsOptional, IsString, IsUrl, IsUUID, MinLength } from 'class-validator'

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

  @ApiProperty()
  @IsUrl({ require_tld: false })
  url!: string

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

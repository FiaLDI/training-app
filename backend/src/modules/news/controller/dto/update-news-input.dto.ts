import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

import { IsNewsSections } from '../../core/lib/is-news-sections.validator'
import type { NewsSection } from '../../core/types'
import { NEWS_SLUG_PATTERN } from './create-news-input.dto'

export class UpdateNewsInputDto {
  @ApiPropertyOptional({ example: 'what-you-can-do', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Matches(NEWS_SLUG_PATTERN, {
    message: 'slug: латиница, цифры и дефис, без пробелов',
  })
  @MaxLength(80)
  slug?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt?: string

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsNewsSections()
  sections?: NewsSection[]

  @ApiPropertyOptional({ example: '2026-09-09T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  @Type(() => String)
  publishedAt?: string
}

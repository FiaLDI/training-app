import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsDateString,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

import { IsNewsSections } from '../../core/lib/is-news-sections.validator'
import type { NewsSection } from '../../core/types'

export const NEWS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export class CreateNewsInputDto {
  @ApiProperty({ example: 'what-you-can-do', maxLength: 80 })
  @IsString()
  @Matches(NEWS_SLUG_PATTERN, {
    message: 'slug: латиница, цифры и дефис, без пробелов',
  })
  @MaxLength(80)
  slug!: string

  @ApiProperty({ example: 'Что можно делать в IronLog' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt!: string

  @ApiProperty({ type: 'array' })
  @IsNewsSections()
  sections!: NewsSection[]

  @ApiProperty({ example: '2026-09-09T00:00:00.000Z' })
  @IsDateString()
  @Type(() => String)
  publishedAt!: string
}

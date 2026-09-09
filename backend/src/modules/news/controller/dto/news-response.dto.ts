import { ApiProperty } from '@nestjs/swagger'

import type { NewsSection } from '../../core/types'

export class NewsListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  slug!: string

  @ApiProperty()
  title!: string

  @ApiProperty()
  excerpt!: string

  @ApiProperty()
  publishedAt!: string
}

export class NewsResponseDto extends NewsListItemResponseDto {
  @ApiProperty({ type: 'array' })
  sections!: NewsSection[]

  @ApiProperty()
  createdAt!: string

  @ApiProperty()
  updatedAt!: string
}

export class NewsListResponseDto {
  @ApiProperty({ type: NewsListItemResponseDto, isArray: true })
  items!: NewsListItemResponseDto[]
}

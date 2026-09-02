import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
} from '../../core/types'

export class FeedbackResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid', nullable: true })
  userId!: string | null

  @ApiProperty({ enum: FEEDBACK_CATEGORIES })
  category!: FeedbackCategory

  @ApiProperty()
  message!: string

  @ApiProperty({ nullable: true, example: 5 })
  rating!: number | null

  @ApiProperty({ enum: FEEDBACK_STATUSES })
  status!: FeedbackStatus

  @ApiProperty({ enum: FEEDBACK_PRIORITIES })
  priority!: FeedbackPriority

  @ApiProperty({ type: 'object', additionalProperties: true })
  clientMeta!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string

  @ApiPropertyOptional({ nullable: true, description: 'Present on admin inbox only' })
  authorEmail?: string | null
}

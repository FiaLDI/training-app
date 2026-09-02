import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'

import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  FeedbackPriority,
  FeedbackStatus,
} from '../../core/types'

export class UpdateFeedbackInputDto {
  @ApiPropertyOptional({ enum: FEEDBACK_STATUSES })
  @IsOptional()
  @IsIn([...FEEDBACK_STATUSES])
  status?: FeedbackStatus

  @ApiPropertyOptional({ enum: FEEDBACK_PRIORITIES })
  @IsOptional()
  @IsIn([...FEEDBACK_PRIORITIES])
  priority?: FeedbackPriority
}

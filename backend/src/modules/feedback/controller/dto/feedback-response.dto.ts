import { ApiProperty } from '@nestjs/swagger'

export class FeedbackResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid', nullable: true })
  userId!: string | null

  @ApiProperty({ enum: ['bug', 'idea', 'other'] })
  category!: 'bug' | 'idea' | 'other'

  @ApiProperty()
  message!: string

  @ApiProperty({ nullable: true, example: 5 })
  rating!: number | null

  @ApiProperty({ enum: ['new', 'read', 'resolved'] })
  status!: 'new' | 'read' | 'resolved'

  @ApiProperty({ type: 'object', additionalProperties: true })
  clientMeta!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string
}

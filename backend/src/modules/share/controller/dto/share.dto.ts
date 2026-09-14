import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsUUID } from 'class-validator'

export class CreateShareResponseDto {
  @ApiProperty()
  token!: string

  @ApiProperty({ enum: ['template', 'program'] })
  resourceType!: 'template' | 'program'

  @ApiProperty({ format: 'uuid' })
  resourceId!: string

  @ApiProperty()
  createdAt!: string
}

export class GetShareQueryDto {
  @ApiProperty({ enum: ['template', 'program'] })
  @IsIn(['template', 'program'])
  resourceType!: 'template' | 'program'

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  resourceId!: string
}

export class PublicShareResponseDto {
  @ApiProperty()
  token!: string

  @ApiProperty()
  ownerUsername!: string

  @ApiProperty({ type: 'object', additionalProperties: true })
  resource!: Record<string, unknown>
}

export class ImportShareResponseDto {
  @ApiPropertyOptional({ format: 'uuid' })
  programId?: string

  @ApiPropertyOptional({ format: 'uuid' })
  templateId?: string

  @ApiProperty({ type: [String] })
  skippedExercises!: string[]
}

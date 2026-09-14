import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class JoinCoachInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  code!: string
}

export class AssignProgramInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  traineeId!: string

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  programId!: string

  @ApiPropertyOptional({ description: 'YYYY-MM-DD Monday' })
  @IsOptional()
  @IsString()
  weekStart?: string
}

export class AddSetCommentInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body!: string
}

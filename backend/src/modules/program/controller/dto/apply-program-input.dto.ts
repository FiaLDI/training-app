import { ApiProperty } from '@nestjs/swagger'
import { Matches } from 'class-validator'

export class ApplyProgramInputDto {
  @ApiProperty({ example: '2026-08-03', description: 'Monday of the week (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string
}

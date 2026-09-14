import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, Matches } from 'class-validator'

export class ApplyProgramInputDto {
  @ApiProperty({ example: '2026-08-03', description: 'Monday of the week (YYYY-MM-DD)' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string

  @ApiPropertyOptional({
    description: 'Cancel planned trainings in the week and insert this program instead',
  })
  @IsOptional()
  @IsBoolean()
  replacePlanned?: boolean
}

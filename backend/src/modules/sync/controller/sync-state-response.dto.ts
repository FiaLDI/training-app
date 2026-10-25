import { ApiProperty } from '@nestjs/swagger'

export class SyncStateResponseDto {
  @ApiProperty({ description: 'Trainings collection generation (not row count)' })
  trainings!: number

  @ApiProperty({ description: 'Templates collection generation' })
  templates!: number

  @ApiProperty({ description: 'Programs collection generation' })
  programs!: number

  @ApiProperty({ description: 'Exercises collection generation' })
  exercises!: number

  @ApiProperty({ description: 'Stats cache generation' })
  stats!: number
}

import { ApiProperty } from '@nestjs/swagger'

class ImportSkippedDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty({ enum: ['id', 'name'] })
  reason!: 'id' | 'name'
}

export class ImportSystemExerciseSeedResponseDto {
  @ApiProperty()
  created!: number

  @ApiProperty({ type: [ImportSkippedDto] })
  skipped!: ImportSkippedDto[]

  @ApiProperty()
  imagesAttached!: number
}

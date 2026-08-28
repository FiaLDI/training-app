import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class AddExerciseToTrainingGroupInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  exerciseId!: string
}

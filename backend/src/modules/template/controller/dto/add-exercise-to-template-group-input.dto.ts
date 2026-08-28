import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class AddExerciseToTemplateGroupInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  exerciseId!: string
}

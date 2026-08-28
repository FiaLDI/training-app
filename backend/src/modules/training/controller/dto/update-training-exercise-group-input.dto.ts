import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, Min } from 'class-validator'

export class UpdateTrainingExerciseGroupInputDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number | null
}

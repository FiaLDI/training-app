import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, Min } from 'class-validator'

export class UpdateTrainingSetInputDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  setNumber?: number

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  weight?: number | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  reps?: number | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  rir?: number | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  rpe?: number | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

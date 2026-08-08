import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class UpdateProgramDayInputDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotOrder?: number

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null
}

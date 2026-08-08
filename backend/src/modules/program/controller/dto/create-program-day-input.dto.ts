import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateProgramDayInputDto {
  @ApiProperty({ minimum: 1, maximum: 7, description: '1=Monday … 7=Sunday' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  slotOrder!: number

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  templateId?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null
}

import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterInputDto {
  @ApiProperty({ example: 'athlete@example.com' })
  @IsEmail()
  email!: string
}

export class LoginInputDto {
  @ApiProperty({ example: 'd&R&IDMk', description: 'Permanent login code' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(32)
  code!: string
}

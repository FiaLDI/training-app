import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterInputDto {
  @ApiProperty({ example: 'athlete@example.com' })
  @IsEmail()
  email!: string
}

export class LoginInputDto {
  @ApiProperty({ example: 'aB3!xY9@kLm2', description: 'Permanent login code (12+ chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  code!: string
}

export class CreateUserByAdminInputDto {
  @ApiProperty({ example: 'athlete@example.com' })
  @IsEmail()
  email!: string
}

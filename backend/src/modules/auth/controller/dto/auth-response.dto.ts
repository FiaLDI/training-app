import { ApiProperty } from '@nestjs/swagger'

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  username!: string

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string
}

export class RegisterResponseDto {
  @ApiProperty()
  email!: string

  @ApiProperty({ description: 'True if a new user was created' })
  created!: boolean

  @ApiProperty()
  message!: string
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto

  @ApiProperty()
  accessToken!: string
}

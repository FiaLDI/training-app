import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  username!: string

  @ApiProperty({ enum: ['user', 'admin'] })
  role!: 'user' | 'admin'

  @ApiProperty({ type: 'object', additionalProperties: true })
  metadata!: Record<string, unknown>

  @ApiProperty()
  createdAt!: string
}

export class AdminUserListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  username!: string

  @ApiProperty({ enum: ['user', 'admin'] })
  role!: 'user' | 'admin'

  @ApiProperty()
  createdAt!: string

  @ApiPropertyOptional({ nullable: true })
  lastLoginAt!: string | null
}

export class AdminUsersResponseDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  users!: AdminUserListItemDto[]
}

export class RegisterResponseDto {
  @ApiProperty()
  email!: string

  @ApiProperty({ description: 'True if a new user was created' })
  created!: boolean

  @ApiPropertyOptional({
    description: 'Plaintext login code — only present on create, show once',
  })
  loginCode?: string

  @ApiProperty()
  message!: string
}

export class IssuedLoginCodeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  email!: string

  @ApiPropertyOptional()
  username?: string

  @ApiProperty({ description: 'Plaintext login code — show once, then discard' })
  loginCode!: string
}

export class AuthSessionResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto

  @ApiProperty()
  accessToken!: string
}

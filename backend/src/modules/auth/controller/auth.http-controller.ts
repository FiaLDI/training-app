import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { Response } from 'express'

import { User } from '../core/types'
import { GetMeUseCase } from '../core/use-cases/get-me/get-me.use-case'
import { LoginUseCase } from '../core/use-cases/login/login.use-case'
import { RegisterUseCase } from '../core/use-cases/register/register.use-case'
import { AuthGuard } from '../infrastructure/auth.guard'
import { CurrentUser } from './current-user.decorator'
import { LoginInputDto, RegisterInputDto } from './dto/auth-input.dto'
import {
  AuthSessionResponseDto,
  RegisterResponseDto,
  UserResponseDto,
} from './dto/auth-response.dto'

const COOKIE_NAME = 'access_token'
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

@ApiTags('auth')
@Controller('auth')
export class AuthHttpController {
  constructor(
    @Inject(RegisterUseCase) private readonly registerUseCase: RegisterUseCase,
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(GetMeUseCase) private readonly getMeUseCase: GetMeUseCase,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register by email (or re-log permanent code for existing user)',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  async register(@Body() dto: RegisterInputDto) {
    const result = await this.registerUseCase.execute(dto)
    return {
      ...result,
      message: 'Permanent login code is logged to the server console',
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with permanent code only' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  async login(@Body() dto: LoginInputDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.loginUseCase.execute(dto)
    res.cookie(COOKIE_NAME, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    })
    return result
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear session cookie' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' })
    return { ok: true }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  async me(@CurrentUser() user: User) {
    const result = await this.getMeUseCase.execute({ userId: user.id })
    if (!result.user) throw new NotFoundException('User not found')
    return {
      id: result.user.id,
      email: result.user.email,
      username: result.user.username,
      role: result.user.role,
      metadata: result.user.metadata,
      createdAt: result.user.createdAt,
    }
  }
}

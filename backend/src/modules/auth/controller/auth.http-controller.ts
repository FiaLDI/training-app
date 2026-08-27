import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger'
import { Request, Response } from 'express'

import { RateLimit } from '../../../shared/rate-limit/rate-limit.decorator'
import { RateLimitGuard } from '../../../shared/rate-limit/rate-limit.guard'
import { User } from '../core/types'
import { CreateUserByAdminUseCase } from '../core/use-cases/create-user-by-admin/create-user-by-admin.use-case'
import { GetMeUseCase } from '../core/use-cases/get-me/get-me.use-case'
import { ListUsersUseCase } from '../core/use-cases/list-users/list-users.use-case'
import { LoginUseCase } from '../core/use-cases/login/login.use-case'
import { RegisterUseCase } from '../core/use-cases/register/register.use-case'
import { ResetLoginCodeUseCase } from '../core/use-cases/reset-login-code/reset-login-code.use-case'
import { AdminGuard } from '../infrastructure/admin.guard'
import { AuthSessionService } from '../infrastructure/auth-session.service'
import { AuthGuard } from '../infrastructure/auth.guard'
import {
  ACCESS_TOKEN_COOKIE,
  extractAccessToken,
} from '../infrastructure/extract-access-token'
import { JwtTokenService, TOKEN_TTL_SECONDS } from '../infrastructure/jwt-token.service'
import { CurrentUser } from './current-user.decorator'
import {
  CreateUserByAdminInputDto,
  LoginInputDto,
  RegisterInputDto,
} from './dto/auth-input.dto'
import {
  AdminUsersResponseDto,
  AuthSessionResponseDto,
  IssuedLoginCodeResponseDto,
  RegisterResponseDto,
  UserResponseDto,
} from './dto/auth-response.dto'

const COOKIE_MAX_AGE_MS = TOKEN_TTL_SECONDS * 1000

@ApiTags('auth')
@Controller('auth')
export class AuthHttpController {
  constructor(
    @Inject(RegisterUseCase) private readonly registerUseCase: RegisterUseCase,
    @Inject(LoginUseCase) private readonly loginUseCase: LoginUseCase,
    @Inject(GetMeUseCase) private readonly getMeUseCase: GetMeUseCase,
    @Inject(ListUsersUseCase) private readonly listUsersUseCase: ListUsersUseCase,
    @Inject(CreateUserByAdminUseCase)
    private readonly createUserByAdminUseCase: CreateUserByAdminUseCase,
    @Inject(ResetLoginCodeUseCase)
    private readonly resetLoginCodeUseCase: ResetLoginCodeUseCase,
    private readonly authSession: AuthSessionService,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 3600, name: 'auth-register' })
  @ApiOperation({
    summary: 'Register by email; login code returned once for new accounts only',
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async register(@Body() dto: RegisterInputDto) {
    const result = await this.registerUseCase.execute(dto)
    return {
      ...result,
      message: result.created
        ? 'Account created. Copy the login code now — it will not be shown again.'
        : 'Account already exists. Use your existing login code, or ask an admin to reset it.',
    }
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 900, name: 'auth-login' })
  @ApiOperation({ summary: 'Login with permanent code only' })
  @ApiOkResponse({ type: AuthSessionResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  async login(@Body() dto: LoginInputDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.loginUseCase.execute(dto)
    res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    })
    return result
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current token and clear the session cookie' })
  @ApiOkResponse({ schema: { properties: { ok: { type: 'boolean' } } } })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = extractAccessToken(req)
    if (token) {
      try {
        await this.authSession.revokeToken(token, this.jwtTokenService.verify(token))
      } catch {
        // Token unverifiable — nothing to revoke.
      }
    }

    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' })
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

  @Get('admin/users')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin) — never includes login codes' })
  @ApiOkResponse({ type: AdminUsersResponseDto })
  async listUsers() {
    return this.listUsersUseCase.execute()
  }

  @Post('admin/users')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create user and issue login code once (admin)' })
  @ApiCreatedResponse({ type: IssuedLoginCodeResponseDto })
  async createUser(@Body() dto: CreateUserByAdminInputDto) {
    return this.createUserByAdminUseCase.execute(dto)
  }

  @Post('admin/users/:id/reset-code')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset login code and revoke all sessions (admin); code shown once',
  })
  @ApiOkResponse({ type: IssuedLoginCodeResponseDto })
  async resetCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return this.resetLoginCodeUseCase.execute({
      userId: id,
      actorUserId: actor.id,
    })
  }
}

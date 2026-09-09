import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CACHE_PORT, CachePort } from '../../shared/cache/core/ports/cache.port'
import { RateLimitModule } from '../../shared/rate-limit/rate-limit.module'
import { AuthHttpController } from './controller/auth.http-controller'
import { AUTH_REPOSITORY_PORT } from './core/ports/auth-repository.port'
import { UserEntity } from './core/entity/user.entity'
import { CreateUserByAdminUseCase } from './core/use-cases/create-user-by-admin/create-user-by-admin.use-case'
import { DeleteUserByAdminUseCase } from './core/use-cases/delete-user-by-admin/delete-user-by-admin.use-case'
import { GetAdminUserUseCase } from './core/use-cases/get-admin-user/get-admin-user.use-case'
import { GetMeUseCase } from './core/use-cases/get-me/get-me.use-case'
import { ListUsersUseCase } from './core/use-cases/list-users/list-users.use-case'
import { LoginUseCase } from './core/use-cases/login/login.use-case'
import { RegisterUseCase } from './core/use-cases/register/register.use-case'
import { ResetLoginCodeUseCase } from './core/use-cases/reset-login-code/reset-login-code.use-case'
import { UpdateUserByAdminUseCase } from './core/use-cases/update-user-by-admin/update-user-by-admin.use-case'
import { AdminGuard } from './infrastructure/admin.guard'
import { AuthSessionService } from './infrastructure/auth-session.service'
import { AuthGuard } from './infrastructure/auth.guard'
import { AuthTypeormRepository } from './infrastructure/auth.typeorm-repository'
import { JwtTokenService } from './infrastructure/jwt-token.service'
import { LoginCodeService } from './infrastructure/login-code.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), RateLimitModule],
  controllers: [AuthHttpController],
  providers: [
    AuthTypeormRepository,
    {
      provide: AUTH_REPOSITORY_PORT,
      useExisting: AuthTypeormRepository,
    },
    JwtTokenService,
    LoginCodeService,
    AuthSessionService,
    AuthGuard,
    AdminGuard,
    {
      provide: RegisterUseCase,
      useFactory: (repo: AuthTypeormRepository, codes: LoginCodeService) =>
        new RegisterUseCase(repo, codes),
      inject: [AuthTypeormRepository, LoginCodeService],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        repo: AuthTypeormRepository,
        jwt: JwtTokenService,
        codes: LoginCodeService,
        cache: CachePort,
      ) => new LoginUseCase(repo, jwt, codes, cache),
      inject: [AuthTypeormRepository, JwtTokenService, LoginCodeService, CACHE_PORT],
    },
    {
      provide: GetMeUseCase,
      useFactory: (repo: AuthTypeormRepository) => new GetMeUseCase(repo),
      inject: [AuthTypeormRepository],
    },
    {
      provide: ListUsersUseCase,
      useFactory: (repo: AuthTypeormRepository) => new ListUsersUseCase(repo),
      inject: [AuthTypeormRepository],
    },
    {
      provide: CreateUserByAdminUseCase,
      useFactory: (repo: AuthTypeormRepository, codes: LoginCodeService) =>
        new CreateUserByAdminUseCase(repo, codes),
      inject: [AuthTypeormRepository, LoginCodeService],
    },
    {
      provide: ResetLoginCodeUseCase,
      useFactory: (
        repo: AuthTypeormRepository,
        codes: LoginCodeService,
        session: AuthSessionService,
      ) => new ResetLoginCodeUseCase(repo, codes, session),
      inject: [AuthTypeormRepository, LoginCodeService, AuthSessionService],
    },
    {
      provide: GetAdminUserUseCase,
      useFactory: (repo: AuthTypeormRepository) => new GetAdminUserUseCase(repo),
      inject: [AuthTypeormRepository],
    },
    {
      provide: UpdateUserByAdminUseCase,
      useFactory: (repo: AuthTypeormRepository, session: AuthSessionService) =>
        new UpdateUserByAdminUseCase(repo, session),
      inject: [AuthTypeormRepository, AuthSessionService],
    },
    {
      provide: DeleteUserByAdminUseCase,
      useFactory: (repo: AuthTypeormRepository, session: AuthSessionService) =>
        new DeleteUserByAdminUseCase(repo, session),
      inject: [AuthTypeormRepository, AuthSessionService],
    },
  ],
  exports: [
    AuthGuard,
    AdminGuard,
    JwtTokenService,
    AuthSessionService,
    AUTH_REPOSITORY_PORT,
  ],
})
export class AuthModule {}

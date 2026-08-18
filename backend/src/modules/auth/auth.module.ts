import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthHttpController } from './controller/auth.http-controller'
import { AUTH_REPOSITORY_PORT } from './core/ports/auth-repository.port'
import { UserEntity } from './core/entity/user.entity'
import { GetMeUseCase } from './core/use-cases/get-me/get-me.use-case'
import { LoginUseCase } from './core/use-cases/login/login.use-case'
import { RegisterUseCase } from './core/use-cases/register/register.use-case'
import { AdminGuard } from './infrastructure/admin.guard'
import { AuthGuard } from './infrastructure/auth.guard'
import { AuthTypeormRepository } from './infrastructure/auth.typeorm-repository'
import { JwtTokenService } from './infrastructure/jwt-token.service'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthHttpController],
  providers: [
    AuthTypeormRepository,
    {
      provide: AUTH_REPOSITORY_PORT,
      useExisting: AuthTypeormRepository,
    },
    JwtTokenService,
    AuthGuard,
    AdminGuard,
    {
      provide: RegisterUseCase,
      useFactory: (repo: AuthTypeormRepository) => new RegisterUseCase(repo),
      inject: [AuthTypeormRepository],
    },
    {
      provide: LoginUseCase,
      useFactory: (repo: AuthTypeormRepository, jwt: JwtTokenService) =>
        new LoginUseCase(repo, jwt),
      inject: [AuthTypeormRepository, JwtTokenService],
    },
    {
      provide: GetMeUseCase,
      useFactory: (repo: AuthTypeormRepository) => new GetMeUseCase(repo),
      inject: [AuthTypeormRepository],
    },
  ],
  exports: [AuthGuard, AdminGuard, JwtTokenService, AUTH_REPOSITORY_PORT],
})
export class AuthModule {}

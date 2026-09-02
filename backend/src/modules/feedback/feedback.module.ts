import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { UserEntity } from '../auth/core/entity/user.entity'
import { FeedbackHttpController } from './controller/feedback.http-controller'
import { FeedbackEntity } from './core/entity/feedback.entity'
import { FeedbackTypeormRepository } from './infrastructure/feedback.typeorm-repository'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([FeedbackEntity, UserEntity])],
  controllers: [FeedbackHttpController],
  providers: [FeedbackTypeormRepository],
  exports: [FeedbackTypeormRepository],
})
export class FeedbackModule {}

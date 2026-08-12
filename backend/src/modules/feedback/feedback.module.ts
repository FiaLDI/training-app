import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { FeedbackHttpController } from './controller/feedback.http-controller'
import { FeedbackEntity } from './core/entity/feedback.entity'
import { FeedbackTypeormRepository } from './infrastructure/feedback.typeorm-repository'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([FeedbackEntity])],
  controllers: [FeedbackHttpController],
  providers: [FeedbackTypeormRepository],
  exports: [FeedbackTypeormRepository],
})
export class FeedbackModule {}

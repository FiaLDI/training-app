import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { NewsHttpController } from './controller/news.http-controller'
import { NewsEntity } from './core/entity/news.entity'
import { NewsTypeormRepository } from './infrastructure/news.typeorm-repository'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([NewsEntity])],
  controllers: [NewsHttpController],
  providers: [NewsTypeormRepository],
})
export class NewsModule {}

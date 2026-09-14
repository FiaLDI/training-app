import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { ProgramModule } from '../program/program.module'
import { TemplateModule } from '../template/template.module'
import { RateLimitModule } from '../../shared/rate-limit/rate-limit.module'
import { ShareHttpController } from './controller/share.http-controller'
import { ShareLinkEntity } from './core/entity/share-link.entity'
import { ShareService } from './core/share.service'

@Module({
  imports: [
    AuthModule,
    RateLimitModule,
    ProgramModule,
    TemplateModule,
    TypeOrmModule.forFeature([ShareLinkEntity]),
  ],
  controllers: [ShareHttpController],
  providers: [ShareService],
})
export class ShareModule {}

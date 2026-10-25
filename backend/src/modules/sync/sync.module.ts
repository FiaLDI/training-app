import { Module } from '@nestjs/common'

import { StatsCacheService } from '../../shared/stats/stats-cache.service'
import { AuthModule } from '../auth/auth.module'
import { SyncHttpController } from './controller/sync.http-controller'

@Module({
  imports: [AuthModule],
  controllers: [SyncHttpController],
  providers: [StatsCacheService],
})
export class SyncModule {}

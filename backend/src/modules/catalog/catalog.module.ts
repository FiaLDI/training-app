import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { CatalogHttpController } from './controller/catalog.http-controller'
import { CatalogProgramEntity } from './core/entity/catalog-program.entity'
import { CatalogService } from './core/catalog.service'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CatalogProgramEntity])],
  controllers: [CatalogHttpController],
  providers: [CatalogService],
})
export class CatalogModule {}

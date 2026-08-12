import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthModule } from '../auth/auth.module'
import { BodyMeasurementHttpController } from './controller/body-measurement.http-controller'
import { BodyMeasurementEntity } from './core/entity/body-measurement.entity'
import { BodyMeasurementTypeormRepository } from './infrastructure/body-measurement.typeorm-repository'

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([BodyMeasurementEntity])],
  controllers: [BodyMeasurementHttpController],
  providers: [BodyMeasurementTypeormRepository],
  exports: [BodyMeasurementTypeormRepository],
})
export class BodyMeasurementModule {}

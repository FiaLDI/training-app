import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { EquipmentHttpController } from './controller/equipment.http-controller'
import { EquipmentEntity } from './core/entity/equipment.entity'
import { EQUIPMENT_REPOSITORY_PORT } from './core/ports/equipment-repository.port'
import { CreateEquipmentUseCase } from './core/use-cases/create/create-equipment.use-case'
import { DeleteEquipmentUseCase } from './core/use-cases/delete/delete-equipment.use-case'
import { ListEquipmentUseCase } from './core/use-cases/list/list-equipment.use-case'
import { EquipmentTypeormRepository } from './infrastructure/equipment.typeorm-repository'

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentEntity])],
  controllers: [EquipmentHttpController],
  providers: [
    EquipmentTypeormRepository,
    {
      provide: EQUIPMENT_REPOSITORY_PORT,
      useExisting: EquipmentTypeormRepository,
    },
    {
      provide: ListEquipmentUseCase,
      useFactory: (repo: EquipmentTypeormRepository) => new ListEquipmentUseCase(repo),
      inject: [EquipmentTypeormRepository],
    },
    {
      provide: CreateEquipmentUseCase,
      useFactory: (repo: EquipmentTypeormRepository) => new CreateEquipmentUseCase(repo),
      inject: [EquipmentTypeormRepository],
    },
    {
      provide: DeleteEquipmentUseCase,
      useFactory: (repo: EquipmentTypeormRepository) => new DeleteEquipmentUseCase(repo),
      inject: [EquipmentTypeormRepository],
    },
  ],
  exports: [ListEquipmentUseCase, CreateEquipmentUseCase, EQUIPMENT_REPOSITORY_PORT],
})
export class EquipmentModule {}

import { ConflictException } from '@nestjs/common'

import { UseCase } from '../../../../../common/core/use-case'
import { EquipmentRepositoryPort } from '../../ports/equipment-repository.port'
import { CreateEquipmentInput } from './interfaces/create-equipment.input'
import { CreateEquipmentOutput } from './interfaces/create-equipment.output'

export class CreateEquipmentUseCase
  implements UseCase<CreateEquipmentInput, CreateEquipmentOutput>
{
  constructor(private readonly equipmentRepository: EquipmentRepositoryPort) {}

  public async execute(input: CreateEquipmentInput): Promise<CreateEquipmentOutput> {
    const existing = await this.equipmentRepository.findByName(input.name)
    if (existing) {
      throw new ConflictException('Equipment with this name already exists')
    }

    const equipment = await this.equipmentRepository.create(input)
    return { equipment }
  }
}

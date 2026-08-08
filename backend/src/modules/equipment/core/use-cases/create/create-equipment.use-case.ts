import { UseCase } from '../../../../../common/core/use-case'
import { EquipmentRepositoryPort } from '../../ports/equipment-repository.port'
import { CreateEquipmentInput } from './interfaces/create-equipment.input'
import { CreateEquipmentOutput } from './interfaces/create-equipment.output'

export class CreateEquipmentUseCase
  implements UseCase<CreateEquipmentInput, CreateEquipmentOutput>
{
  constructor(private readonly equipmentRepository: EquipmentRepositoryPort) {}

  public async execute(input: CreateEquipmentInput): Promise<CreateEquipmentOutput> {
    if (input.id) {
      const byId = await this.equipmentRepository.getById(input.id)
      if (byId) return { equipment: byId }
    }

    const byName = await this.equipmentRepository.findByName(input.name)
    if (byName) return { equipment: byName }

    const equipment = await this.equipmentRepository.create(input)
    return { equipment }
  }
}

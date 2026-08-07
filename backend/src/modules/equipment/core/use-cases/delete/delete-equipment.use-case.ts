import { UseCase } from '../../../../../common/core/use-case'
import { EquipmentRepositoryPort } from '../../ports/equipment-repository.port'
import { DeleteEquipmentInput } from './interfaces/delete-equipment.input'
import { DeleteEquipmentOutput } from './interfaces/delete-equipment.output'

export class DeleteEquipmentUseCase
  implements UseCase<DeleteEquipmentInput, DeleteEquipmentOutput>
{
  constructor(private readonly equipmentRepository: EquipmentRepositoryPort) {}

  public async execute(input: DeleteEquipmentInput): Promise<DeleteEquipmentOutput> {
    const deleted = await this.equipmentRepository.delete(input.id)
    return { deleted }
  }
}

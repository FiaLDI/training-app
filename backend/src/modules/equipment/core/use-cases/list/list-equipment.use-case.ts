import { UseCase } from '../../../../../common/core/use-case'
import { EquipmentRepositoryPort } from '../../ports/equipment-repository.port'
import { ListEquipmentInput } from './interfaces/list-equipment.input'
import { ListEquipmentOutput } from './interfaces/list-equipment.output'

export class ListEquipmentUseCase implements UseCase<ListEquipmentInput, ListEquipmentOutput> {
  constructor(private readonly equipmentRepository: EquipmentRepositoryPort) {}

  public async execute(input: ListEquipmentInput): Promise<ListEquipmentOutput> {
    return this.equipmentRepository.list(input)
  }
}

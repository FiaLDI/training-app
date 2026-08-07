import { Equipment } from '../../../types'

export interface ListEquipmentOutput {
  items: Equipment[]
  total: number
  page: number
  limit: number
}

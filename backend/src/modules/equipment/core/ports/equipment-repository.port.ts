import { Equipment } from '../types'

export interface ListEquipmentRepositoryInput {
  page: number
  limit: number
  q?: string
}

export interface ListEquipmentRepositoryOutput {
  items: Equipment[]
  total: number
  page: number
  limit: number
}

export interface CreateEquipmentRepositoryInput {
  name: string
  metadata?: Record<string, unknown>
}

export interface EquipmentRepositoryPort {
  list(input: ListEquipmentRepositoryInput): Promise<ListEquipmentRepositoryOutput>
  getById(id: string): Promise<Equipment | null>
  findByName(name: string): Promise<Equipment | null>
  create(input: CreateEquipmentRepositoryInput): Promise<Equipment>
  delete(id: string): Promise<boolean>
}

export const EQUIPMENT_REPOSITORY_PORT = Symbol('EQUIPMENT_REPOSITORY_PORT')

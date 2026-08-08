'use client'

import { create } from 'zustand'

import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'

import type { CreateEquipmentInput, Equipment } from './types'

type EquipmentStore = {
  items: Equipment[]
  loading: boolean
  error: string | null
  fetchList: () => Promise<void>
  create: (input: CreateEquipmentInput) => Promise<Equipment>
  remove: (id: string) => Promise<void>
}

export const useEquipmentStore = create<EquipmentStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  async fetchList() {
    set({ loading: true, error: null })
    try {
      await catalogSync.mergeFromServer()
      set({ items: localData.equipment.list(), loading: false })
    } catch (error) {
      set({
        items: localData.equipment.list(),
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить инвентарь',
      })
    }
  },

  async create(input) {
    const equipment = await catalogSync.createEquipment(input)
    set((state) => ({
      items: [...state.items.filter((item) => item.id !== equipment.id), equipment].sort((a, b) =>
        a.name.localeCompare(b.name, 'ru'),
      ),
    }))
    return equipment
  },

  async remove(id) {
    await catalogSync.removeEquipment(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
}))

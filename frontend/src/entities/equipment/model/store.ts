'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { equipmentApi } from '../api/equipment-api'
import type { CreateEquipmentInput, Equipment } from './types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

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
      if (isLocalMode()) {
        set({ items: localData.equipment.list(), loading: false })
        return
      }
      const result = await equipmentApi.list({ limit: 200 })
      set({ items: result.items, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить инвентарь',
      })
    }
  },

  async create(input) {
    if (isLocalMode()) {
      const equipment = localData.equipment.create(input)
      set((state) => ({
        items: [...state.items, equipment].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      }))
      return equipment
    }
    const equipment = await equipmentApi.create(input)
    set((state) => ({
      items: [...state.items, equipment].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
    }))
    return equipment
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.equipment.remove(id)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }))
      return
    }
    await equipmentApi.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }))
  },
}))

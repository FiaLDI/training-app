'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { isRetriableWriteError } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { localData } from '@/shared/lib/local-data'

import { bodyMeasurementApi } from '../api/body-measurement-api'
import type { BodyMeasurement } from '../model/types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

type BodyMeasurementStore = {
  items: BodyMeasurement[]
  loading: boolean
  error: string | null
  fetchList: (params?: { from?: string; to?: string }) => Promise<void>
  create: (weight: number, measuredAt?: string) => Promise<BodyMeasurement>
  remove: (id: string) => Promise<void>
}

export const useBodyMeasurementStore = create<BodyMeasurementStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  async fetchList(params) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({
          items: localData.bodyMeasurements.list(params?.from, params?.to),
          loading: false,
        })
        return
      }

      try {
        const result = await bodyMeasurementApi.list(params)
        for (const item of result.items) {
          localData.bodyMeasurements.upsert(item)
        }
        set({ items: result.items, loading: false })
      } catch (error) {
        set({
          items: localData.bodyMeasurements.list(params?.from, params?.to),
          loading: false,
          error:
            error instanceof Error
              ? `${error.message}. Показаны локальные записи.`
              : 'Сеть недоступна. Показаны локальные записи.',
        })
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить вес',
      })
    }
  },

  async create(weight, measuredAt) {
    const id = createLocalId()
    const payload = {
      id,
      weight,
      measuredAt: measuredAt ?? new Date().toISOString(),
    }

    if (isLocalMode()) {
      const item = localData.bodyMeasurements.create(payload)
      set((state) => ({
        items: [item, ...state.items.filter((entry) => entry.id !== item.id)],
      }))
      return item
    }

    try {
      const item = await bodyMeasurementApi.create(payload)
      localData.bodyMeasurements.upsert(item)
      set((state) => ({
        items: [item, ...state.items.filter((entry) => entry.id !== item.id)],
      }))
      return item
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const item = localData.bodyMeasurements.create(payload)
      set((state) => ({
        items: [item, ...state.items.filter((entry) => entry.id !== item.id)],
      }))
      return item
    }
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.bodyMeasurements.remove(id)
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
      return
    }

    try {
      await bodyMeasurementApi.remove(id)
      localData.bodyMeasurements.remove(id)
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      localData.bodyMeasurements.remove(id)
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }))
    }
  },
}))

'use client'

import { create } from 'zustand'

import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'

import type { CreateExerciseInput, Exercise, UpdateExerciseInput } from './types'

const CATALOG_READ_TIMEOUT_MS = 4000

type ExerciseStore = {
  items: Exercise[]
  total: number
  current: Exercise | null
  loading: boolean
  error: string | null
  query: string
  fetchList: (q?: string) => Promise<void>
  fetchOne: (id: string) => Promise<void>
  create: (input: CreateExerciseInput) => Promise<Exercise>
  update: (id: string, input: UpdateExerciseInput) => Promise<Exercise>
  remove: (id: string) => Promise<void>
  setQuery: (q: string) => void
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  items: [],
  total: 0,
  current: null,
  loading: false,
  error: null,
  query: '',

  setQuery(q) {
    set({ query: q })
  },

  async fetchList(q) {
    const query = (q ?? get().query) || undefined
    // Local-first: show catalog immediately, refresh in background.
    const localItems = localData.exercises.list(query)
    set({
      items: localItems,
      total: localItems.length,
      loading: localItems.length === 0,
      error: null,
    })

    try {
      await catalogSync.mergeFromServer({ timeoutMs: CATALOG_READ_TIMEOUT_MS })
      const items = localData.exercises.list(query)
      set({ items, total: items.length, loading: false })
    } catch (error) {
      const items = localData.exercises.list(query)
      set({
        items,
        total: items.length,
        loading: false,
        error:
          items.length === 0 && error instanceof Error
            ? error.message
            : items.length === 0
              ? 'Не удалось загрузить упражнения'
              : null,
      })
    }
  },

  async fetchOne(id) {
    const local = localData.exercises.get(id)
    set({ current: local, loading: !local, error: null })

    try {
      await catalogSync.mergeFromServer({ timeoutMs: CATALOG_READ_TIMEOUT_MS })
      set({ current: localData.exercises.get(id), loading: false })
    } catch (error) {
      set({
        current: localData.exercises.get(id) ?? local,
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить упражнение',
      })
    }
  },

  async create(input) {
    const exercise = await catalogSync.createExercise(input)
    set((state) => ({
      items: [exercise, ...state.items.filter((item) => item.id !== exercise.id)],
      total: state.total + 1,
    }))
    return exercise
  },

  async update(id, input) {
    const exercise = await catalogSync.updateExercise(id, input)
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? exercise : item)),
      current: state.current?.id === id ? exercise : state.current,
    }))
    return exercise
  },

  async remove(id) {
    await catalogSync.removeExercise(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      total: Math.max(0, state.total - 1),
      current: state.current?.id === id ? null : state.current,
    }))
  },
}))

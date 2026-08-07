'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { exerciseApi } from '../api/exercise-api'
import type { CreateExerciseInput, Exercise, UpdateExerciseInput } from './types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

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
    set({ loading: true, error: null })
    try {
      const query = (q ?? get().query) || undefined
      if (isLocalMode()) {
        const items = localData.exercises.list(query)
        set({ items, total: items.length, loading: false })
        return
      }
      const result = await exerciseApi.list({
        limit: 100,
        q: query,
      })
      set({ items: result.items, total: result.total, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load exercises',
      })
    }
  },

  async fetchOne(id) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ current: localData.exercises.get(id), loading: false })
        return
      }
      const current = await exerciseApi.getById(id)
      set({ current, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load exercise',
      })
    }
  },

  async create(input) {
    if (isLocalMode()) {
      const exercise = localData.exercises.create(input)
      set((state) => ({ items: [exercise, ...state.items], total: state.total + 1 }))
      return exercise
    }
    const exercise = await exerciseApi.create(input)
    set((state) => ({ items: [exercise, ...state.items], total: state.total + 1 }))
    return exercise
  },

  async update(id, input) {
    if (isLocalMode()) {
      const exercise = localData.exercises.update(id, input)
      if (!exercise) throw new Error('Exercise not found')
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? exercise : item)),
        current: state.current?.id === id ? exercise : state.current,
      }))
      return exercise
    }
    const exercise = await exerciseApi.update(id, input)
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? exercise : item)),
      current: state.current?.id === id ? exercise : state.current,
    }))
    return exercise
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.exercises.remove(id)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        total: Math.max(0, state.total - 1),
        current: state.current?.id === id ? null : state.current,
      }))
      return
    }
    await exerciseApi.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      total: Math.max(0, state.total - 1),
      current: state.current?.id === id ? null : state.current,
    }))
  },
}))

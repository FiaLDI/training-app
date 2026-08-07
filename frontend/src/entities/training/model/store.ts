'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { trainingApi } from '../api/training-api'
import type {
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingWithDetails,
} from './types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

type TrainingStore = {
  items: Training[]
  current: TrainingWithDetails | null
  loading: boolean
  error: string | null
  fetchList: (params?: { limit?: number }) => Promise<void>
  fetchOne: (id: string) => Promise<void>
  create: (input: CreateTrainingInput) => Promise<Training>
  finish: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  addExercise: (trainingId: string, input: CreateTrainingExerciseInput) => Promise<void>
  addSet: (trainingId: string, exerciseId: string, input: CreateTrainingSetInput) => Promise<void>
  removeSet: (trainingId: string, setId: string) => Promise<void>
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  items: [],
  current: null,
  loading: false,
  error: null,

  async fetchList(params) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ items: localData.trainings.list(), loading: false })
        return
      }
      const result = await trainingApi.list({ limit: params?.limit ?? 100 })
      set({ items: result.items, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load trainings',
      })
    }
  },

  async fetchOne(id) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ current: localData.trainings.get(id), loading: false })
        return
      }
      const current = await trainingApi.getById(id)
      set({ current, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load training',
      })
    }
  },

  async create(input) {
    if (isLocalMode()) {
      const training = localData.trainings.create(input)
      set((state) => ({ items: [training, ...state.items] }))
      return training
    }
    const training = await trainingApi.create(input)
    set((state) => ({ items: [training, ...state.items] }))
    return training
  },

  async finish(id) {
    if (isLocalMode()) {
      localData.trainings.finish(id)
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
      return
    }
    await trainingApi.update(id, {
      status: 'finished',
      finishedAt: new Date().toISOString(),
    })
    const current = await trainingApi.getById(id)
    set((state) => ({
      current,
      items: state.items.map((item) => (item.id === id ? current : item)),
    }))
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.trainings.remove(id)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        current: state.current?.id === id ? null : state.current,
      }))
      return
    }
    await trainingApi.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
  },

  async addExercise(trainingId, input) {
    if (isLocalMode()) {
      localData.trainings.addExercise(trainingId, input)
      set({ current: localData.trainings.get(trainingId) })
      return
    }
    await trainingApi.addExercise(trainingId, input)
    const current = await trainingApi.getById(trainingId)
    set({ current })
  },

  async addSet(trainingId, exerciseId, input) {
    if (isLocalMode()) {
      localData.trainings.addSet(exerciseId, input)
      set({ current: localData.trainings.get(trainingId) })
      return
    }
    await trainingApi.addSet(exerciseId, input)
    const current = await trainingApi.getById(trainingId)
    set({ current })
  },

  async removeSet(trainingId, setId) {
    if (isLocalMode()) {
      localData.trainings.removeSet(setId)
      set({ current: localData.trainings.get(trainingId) })
      return
    }
    await trainingApi.removeSet(setId)
    const current = await trainingApi.getById(trainingId)
    set({ current })
  },
}))

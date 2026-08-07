'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { templateApi } from '../api/template-api'
import type {
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from './types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

type TemplateStore = {
  items: WorkoutTemplate[]
  current: WorkoutTemplateWithExercises | null
  loading: boolean
  error: string | null
  fetchList: (q?: string) => Promise<void>
  fetchOne: (id: string) => Promise<void>
  create: (input: CreateTemplateInput) => Promise<WorkoutTemplate>
  remove: (id: string) => Promise<void>
  addExercise: (templateId: string, input: CreateTemplateExerciseInput) => Promise<void>
  updateExercise: (
    templateId: string,
    exerciseRowId: string,
    input: UpdateTemplateExerciseInput,
  ) => Promise<void>
  removeExercise: (templateId: string, exerciseRowId: string) => Promise<void>
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  items: [],
  current: null,
  loading: false,
  error: null,

  async fetchList(q) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ items: localData.templates.list(q), loading: false })
        return
      }
      const result = await templateApi.list({ limit: 100, q })
      set({ items: result.items, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load templates',
      })
    }
  },

  async fetchOne(id) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ current: localData.templates.get(id), loading: false })
        return
      }
      const current = await templateApi.getById(id)
      set({ current, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load template',
      })
    }
  },

  async create(input) {
    if (isLocalMode()) {
      const template = localData.templates.create(input)
      set((state) => ({ items: [template, ...state.items] }))
      return template
    }
    const template = await templateApi.create(input)
    set((state) => ({ items: [template, ...state.items] }))
    return template
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.templates.remove(id)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        current: state.current?.id === id ? null : state.current,
      }))
      return
    }
    await templateApi.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
  },

  async addExercise(templateId, input) {
    if (isLocalMode()) {
      localData.templates.addExercise(templateId, input)
      set({ current: localData.templates.get(templateId) })
      return
    }
    await templateApi.addExercise(templateId, input)
    const current = await templateApi.getById(templateId)
    set({ current })
  },

  async updateExercise(templateId, exerciseRowId, input) {
    if (isLocalMode()) {
      localData.templates.updateExercise(exerciseRowId, input)
      set({ current: localData.templates.get(templateId) })
      return
    }
    await templateApi.updateExercise(exerciseRowId, input)
    const current = await templateApi.getById(templateId)
    set({ current })
  },

  async removeExercise(templateId, exerciseRowId) {
    if (isLocalMode()) {
      localData.templates.removeExercise(exerciseRowId)
      set({ current: localData.templates.get(templateId) })
      return
    }
    await templateApi.removeExercise(exerciseRowId)
    const current = await templateApi.getById(templateId)
    set({ current })
  },
}))

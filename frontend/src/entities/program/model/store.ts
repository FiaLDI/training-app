'use client'

import { create } from 'zustand'

import { useSessionStore } from '@/entities/session/model/store'
import { localData } from '@/shared/lib/local-data'

import { programApi } from '../api/program-api'
import type {
  CreateProgramDayInput,
  CreateProgramInput,
  Program,
  ProgramWithDays,
  UpdateProgramDayInput,
} from './types'

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

type ProgramStore = {
  items: Program[]
  current: ProgramWithDays | null
  loading: boolean
  error: string | null
  fetchList: () => Promise<void>
  fetchOne: (id: string) => Promise<void>
  create: (input: CreateProgramInput) => Promise<Program>
  remove: (id: string) => Promise<void>
  addDay: (programId: string, input: CreateProgramDayInput) => Promise<void>
  updateDay: (programId: string, dayId: string, input: UpdateProgramDayInput) => Promise<void>
  removeDay: (programId: string, dayId: string) => Promise<void>
  apply: (programId: string, weekStart: string) => Promise<{ created: number; skipped: number }>
}

export const useProgramStore = create<ProgramStore>((set) => ({
  items: [],
  current: null,
  loading: false,
  error: null,

  async fetchList() {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ items: localData.programs.list(), loading: false })
        return
      }
      const result = await programApi.list({ limit: 100 })
      set({ items: result.items, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить программы',
      })
    }
  },

  async fetchOne(id) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ current: localData.programs.get(id), loading: false })
        return
      }
      const current = await programApi.getById(id)
      set({ current, loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить программу',
      })
    }
  },

  async create(input) {
    if (isLocalMode()) {
      const program = localData.programs.create(input)
      set((state) => ({ items: [program, ...state.items] }))
      return program
    }
    const program = await programApi.create(input)
    set((state) => ({ items: [program, ...state.items] }))
    return program
  },

  async remove(id) {
    if (isLocalMode()) {
      localData.programs.remove(id)
    } else {
      await programApi.remove(id)
    }
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
  },

  async addDay(programId, input) {
    if (isLocalMode()) {
      localData.programs.addDay(programId, input)
      set({ current: localData.programs.get(programId) })
      return
    }
    await programApi.addDay(programId, input)
    set({ current: await programApi.getById(programId) })
  },

  async updateDay(programId, dayId, input) {
    if (isLocalMode()) {
      localData.programs.updateDay(dayId, input)
      set({ current: localData.programs.get(programId) })
      return
    }
    await programApi.updateDay(dayId, input)
    set({ current: await programApi.getById(programId) })
  },

  async removeDay(programId, dayId) {
    if (isLocalMode()) {
      localData.programs.removeDay(dayId)
      set({ current: localData.programs.get(programId) })
      return
    }
    await programApi.removeDay(dayId)
    set({ current: await programApi.getById(programId) })
  },

  async apply(programId, weekStart) {
    if (isLocalMode()) {
      const result = localData.programs.apply(programId, weekStart)
      return { created: result.created.length, skipped: result.skipped }
    }
    const result = await programApi.apply(programId, weekStart)
    return { created: result.created.length, skipped: result.skipped }
  },
}))

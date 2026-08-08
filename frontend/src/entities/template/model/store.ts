'use client'

import { create } from 'zustand'

import { useSyncNoticeStore } from '@/features/sync-trainings/model/sync-notice-store'
import { useSessionStore } from '@/entities/session/model/store'
import { isRetriableWriteError, syncFailReason } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { localData } from '@/shared/lib/local-data'
import {
  isTemplatePendingSync,
  markTemplatePending,
  mirrorTemplateLocally,
} from '@/shared/lib/template-sync-meta'

import { templateApi } from '../api/template-api'
import type {
  CreateTemplateExerciseInput,
  CreateTemplateInput,
  UpdateTemplateExerciseInput,
  WorkoutTemplate,
  WorkoutTemplateWithExercises,
} from './types'

const WRITE_TIMEOUT_MS = 5000

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

function notifyLocalSave() {
  useSyncNoticeStore.getState().notifySavedLocally()
}

function mergeCloudWithPending(cloudItems: WorkoutTemplate[]): WorkoutTemplate[] {
  const pending = localData.templates.list().filter(isTemplatePendingSync)
  const byId = new Map<string, WorkoutTemplate>()
  for (const item of cloudItems) byId.set(item.id, item)
  for (const item of pending) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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

export const useTemplateStore = create<TemplateStore>((set, get) => ({
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
      try {
        const result = await templateApi.list({
          limit: 100,
          q,
          timeoutMs: WRITE_TIMEOUT_MS,
        })
        for (const item of result.items) {
          if (!localData.templates.get(item.id)) {
            localData.templates.upsert({
              ...item,
              metadata: {
                ...item.metadata,
                sync: { status: 'synced', serverSyncedAt: new Date().toISOString() },
              },
            })
          }
        }
        set({ items: mergeCloudWithPending(result.items), loading: false })
      } catch (error) {
        set({
          items: mergeCloudWithPending(localData.templates.list(q)),
          loading: false,
          error:
            error instanceof Error
              ? `${error.message}. Показаны локальные планы.`
              : 'Сеть недоступна. Показаны локальные планы.',
        })
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить планы',
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
      try {
        const current = await templateApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
        set({ current: mirrorTemplateLocally(current, 'synced'), loading: false })
      } catch (error) {
        const local = localData.templates.get(id)
        if (local) {
          set({
            current: local,
            loading: false,
            error:
              error instanceof Error
                ? `${error.message}. Открыта локальная копия.`
                : 'Сеть недоступна. Открыта локальная копия.',
          })
          return
        }
        throw error
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить план',
      })
    }
  },

  async create(input) {
    const id = input.id ?? createLocalId()
    if (isLocalMode()) {
      const template = localData.templates.create({
        ...input,
        id,
        metadata: {
          ...(input.metadata ?? {}),
          sync: { status: 'pending', reason: 'local_mode' },
        },
      })
      set((state) => ({ items: [template, ...state.items] }))
      return template
    }

    try {
      const template = await templateApi.create(
        { ...input, id },
        { timeoutMs: WRITE_TIMEOUT_MS },
      )
      localData.templates.upsert({
        ...template,
        metadata: {
          ...template.metadata,
          sync: { status: 'synced', serverSyncedAt: new Date().toISOString() },
        },
      })
      set((state) => ({ items: [template, ...state.items] }))
      return template
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const template = localData.templates.create({
        ...input,
        id,
        metadata: {
          ...(input.metadata ?? {}),
          sync: {
            status: 'pending',
            reason: syncFailReason(error),
            failedAt: new Date().toISOString(),
          },
        },
      })
      notifyLocalSave()
      set((state) => ({ items: [template, ...state.items] }))
      return template
    }
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
    await templateApi.remove(id, { timeoutMs: WRITE_TIMEOUT_MS })
    localData.templates.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
  },

  async addExercise(templateId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }
    if (isLocalMode()) {
      localData.templates.addExercise(templateId, payload)
      markTemplatePending(templateId, 'local_mode')
      set({ current: localData.templates.get(templateId) })
      return
    }

    try {
      await templateApi.addExercise(templateId, payload, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await templateApi.getById(templateId, { timeoutMs: WRITE_TIMEOUT_MS })
      set({ current: mirrorTemplateLocally(current, 'synced') })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const fallback = get().current
      if (fallback?.id === templateId) mirrorTemplateLocally(fallback, 'pending')
      localData.templates.addExercise(templateId, payload)
      markTemplatePending(templateId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.templates.get(templateId) })
    }
  },

  async updateExercise(templateId, exerciseRowId, input) {
    if (isLocalMode()) {
      localData.templates.updateExercise(exerciseRowId, input)
      markTemplatePending(templateId, 'local_mode')
      set({ current: localData.templates.get(templateId) })
      return
    }
    try {
      await templateApi.updateExercise(exerciseRowId, input, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await templateApi.getById(templateId, { timeoutMs: WRITE_TIMEOUT_MS })
      set({ current: mirrorTemplateLocally(current, 'synced') })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const fallback = get().current
      if (fallback?.id === templateId) mirrorTemplateLocally(fallback, 'pending')
      localData.templates.updateExercise(exerciseRowId, input)
      markTemplatePending(templateId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.templates.get(templateId) })
    }
  },

  async removeExercise(templateId, exerciseRowId) {
    if (isLocalMode()) {
      localData.templates.removeExercise(exerciseRowId)
      markTemplatePending(templateId, 'local_mode')
      set({ current: localData.templates.get(templateId) })
      return
    }
    try {
      await templateApi.removeExercise(exerciseRowId, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await templateApi.getById(templateId, { timeoutMs: WRITE_TIMEOUT_MS })
      set({ current: mirrorTemplateLocally(current, 'synced') })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const fallback = get().current
      if (fallback?.id === templateId) mirrorTemplateLocally(fallback, 'pending')
      localData.templates.removeExercise(exerciseRowId)
      markTemplatePending(templateId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.templates.get(templateId) })
    }
  },
}))

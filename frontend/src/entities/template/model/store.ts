'use client'

import { create } from 'zustand'

import { afterLocalCloudWrite } from '@/features/sync-trainings/model/background-sync'
import { deleteOutbox } from '@/features/sync-trainings/model/delete-outbox'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError } from '@/shared/api/client'
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

const READ_TIMEOUT_MS = 8000

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

function isCloudMode() {
  return useSessionStore.getState().mode === 'cloud'
}

function pendingReason() {
  return isLocalMode() ? ('local_mode' as const) : ('queued' as const)
}

function mergeCloudWithPending(cloudItems: WorkoutTemplate[]): WorkoutTemplate[] {
  const pending = localData.templates.list().filter(isTemplatePendingSync)
  const byId = new Map<string, WorkoutTemplate>()
  for (const item of cloudItems) byId.set(item.id, item)
  for (const item of pending) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function ensureLocalTemplateShell(
  id: string,
  fallback?: WorkoutTemplateWithExercises | null,
) {
  if (localData.templates.get(id)) return
  if (fallback?.id === id) {
    mirrorTemplateLocally(fallback, 'pending')
  }
}

function scheduleCloudSync() {
  afterLocalCloudWrite()
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
    const localItems = mergeCloudWithPending(localData.templates.list(q))
    const catalogKnown = localData.templates.list().length > 0
    set({ items: localItems, loading: !catalogKnown, error: null })
    if (isLocalMode() || catalogKnown) return

    try {
      const result = await templateApi.list({
        limit: 100,
        q,
        timeoutMs: READ_TIMEOUT_MS,
      })
      for (const item of result.items) {
        const local = localData.templates.get(item.id)
        if (local && isTemplatePendingSync(local)) continue
        if (!local) {
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
  },

  async fetchOne(id) {
    const local = localData.templates.get(id)
    if (isLocalMode() || local) {
      set({
        current: local,
        loading: false,
        error: local ? null : 'Не удалось загрузить план',
      })
      return
    }

    set({ current: null, loading: true, error: null })
    try {
      const current = await templateApi.getById(id, { timeoutMs: READ_TIMEOUT_MS })
      set({ current: mirrorTemplateLocally(current, 'synced'), loading: false })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить план',
      })
    }
  },

  async create(input) {
    const id = input.id ?? createLocalId()
    const template = localData.templates.create({
      ...input,
      id,
      metadata: {
        ...(input.metadata ?? {}),
        sync: { status: 'pending', reason: pendingReason() },
      },
    })
    set((state) => ({ items: [template, ...state.items] }))
    if (isCloudMode()) scheduleCloudSync()
    return template
  },

  async remove(id) {
    localData.templates.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
    if (!isCloudMode()) return

    deleteOutbox.enqueue('template', id)
    try {
      await templateApi.remove(id)
      deleteOutbox.dequeue('template', id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        deleteOutbox.dequeue('template', id)
        return
      }
      scheduleCloudSync()
    }
  },

  async addExercise(templateId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }
    ensureLocalTemplateShell(templateId, get().current)
    localData.templates.addExercise(templateId, payload)
    markTemplatePending(templateId, pendingReason())
    set({ current: localData.templates.get(templateId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async updateExercise(templateId, exerciseRowId, input) {
    ensureLocalTemplateShell(templateId, get().current)
    localData.templates.updateExercise(exerciseRowId, input)
    markTemplatePending(templateId, pendingReason())
    set({ current: localData.templates.get(templateId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async removeExercise(templateId, exerciseRowId) {
    ensureLocalTemplateShell(templateId, get().current)
    localData.templates.removeExercise(exerciseRowId)
    markTemplatePending(templateId, pendingReason())
    set({ current: localData.templates.get(templateId) })
    if (!isCloudMode()) return
    deleteOutbox.enqueue('template-exercise', exerciseRowId)
    scheduleCloudSync()
  },
}))

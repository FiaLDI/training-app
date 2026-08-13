'use client'

import { create } from 'zustand'

import { afterLocalCloudWrite } from '@/features/sync-trainings/model/background-sync'
import { deleteOutbox } from '@/features/sync-trainings/model/delete-outbox'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { localData } from '@/shared/lib/local-data'
import {
  isTrainingPendingSync,
  markTrainingPending,
  mirrorTrainingLocally,
  trainingContentHash,
} from '@/shared/lib/training-sync-meta'

import { trainingApi } from '../api/training-api'
import type {
  CreateTrainingExerciseInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingWithDetails,
  UpdateTrainingExerciseInput,
} from './types'

const READ_TIMEOUT_MS = 8000
const BACKGROUND_READ_TIMEOUT_MS = 4000

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

function isCloudMode() {
  return useSessionStore.getState().mode === 'cloud'
}

function pendingReason() {
  return isLocalMode() ? ('local_mode' as const) : ('queued' as const)
}

function mergeCloudWithPending(cloudItems: Training[]): Training[] {
  const pending = localData.trainings.list().filter(isTrainingPendingSync)
  const byId = new Map<string, Training>()
  for (const item of cloudItems) byId.set(item.id, item)
  for (const item of pending) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => {
    const aWhen = a.startedAt ?? a.scheduledAt ?? a.createdAt
    const bWhen = b.startedAt ?? b.scheduledAt ?? b.createdAt
    return bWhen.localeCompare(aWhen)
  })
}

function ensureLocalTrainingShell(id: string, fallback?: TrainingWithDetails | null) {
  if (localData.trainings.get(id)) return
  if (fallback?.id === id) {
    mirrorTrainingLocally(fallback, 'pending')
  }
}

function scheduleCloudSync() {
  afterLocalCloudWrite()
}

type TrainingStore = {
  items: Training[]
  current: TrainingWithDetails | null
  loading: boolean
  error: string | null
  fetchList: (params?: { limit?: number; from?: string; to?: string }) => Promise<void>
  fetchOne: (id: string) => Promise<void>
  create: (input: CreateTrainingInput) => Promise<Training>
  update: (id: string, input: Partial<CreateTrainingInput>) => Promise<void>
  start: (id: string) => Promise<Training>
  finish: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  addExercise: (trainingId: string, input: CreateTrainingExerciseInput) => Promise<void>
  updateExercise: (
    trainingId: string,
    exerciseRowId: string,
    input: UpdateTrainingExerciseInput,
  ) => Promise<void>
  removeExercise: (trainingId: string, exerciseRowId: string) => Promise<void>
  addSet: (trainingId: string, exerciseId: string, input: CreateTrainingSetInput) => Promise<void>
  updateSet: (
    trainingId: string,
    setId: string,
    input: Partial<CreateTrainingSetInput>,
  ) => Promise<void>
  removeSet: (trainingId: string, setId: string) => Promise<void>
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  items: [],
  current: null,
  loading: false,
  error: null,

  async fetchList(params) {
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({
          items: localData.trainings.list({ from: params?.from, to: params?.to }),
          loading: false,
        })
        return
      }

      try {
        const result = await trainingApi.list({
          limit: params?.limit ?? 100,
          from: params?.from,
          to: params?.to,
          timeoutMs: READ_TIMEOUT_MS,
        })
        for (const item of result.items) {
          const local = localData.trainings.get(item.id)
          if (local && isTrainingPendingSync(local)) continue
          if (!local) {
            const shell = {
              ...item,
              exercises: [] as TrainingWithDetails['exercises'],
            }
            localData.trainings.upsert({
              ...item,
              metadata: {
                ...item.metadata,
                sync: {
                  status: 'synced',
                  serverSyncedAt: new Date().toISOString(),
                  contentHash: trainingContentHash(shell),
                },
              },
            })
          }
        }
        set({ items: mergeCloudWithPending(result.items), loading: false })
      } catch (error) {
        const localItems = localData.trainings.list({ from: params?.from, to: params?.to })
        set({
          items: mergeCloudWithPending(localItems),
          loading: false,
          error:
            error instanceof Error
              ? `${error.message}. Показаны локальные тренировки.`
              : 'Сеть недоступна. Показаны локальные тренировки.',
        })
      }
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить тренировки',
      })
    }
  },

  async fetchOne(id) {
    // Local-first: open training immediately from device, refresh in background.
    const local = localData.trainings.get(id)
    if (isLocalMode()) {
      set({ current: local, loading: false, error: null })
      return
    }

    if (local) {
      set({ current: local, loading: false, error: null })
    } else {
      set({ loading: true, error: null, current: null })
    }

    // Pending local edits are source of truth — never block on network.
    if (local && isTrainingPendingSync(local)) {
      return
    }

    try {
      const remote = await trainingApi.getById(id, {
        timeoutMs: local ? BACKGROUND_READ_TIMEOUT_MS : READ_TIMEOUT_MS,
      })
      // Don't clobber newer local writes that arrived while the request was in flight.
      const latestLocal = localData.trainings.get(id)
      if (latestLocal && isTrainingPendingSync(latestLocal)) {
        set({ current: latestLocal, loading: false })
        return
      }
      const mirrored = mirrorTrainingLocally(remote, 'synced')
      set({ current: mirrored, loading: false, error: null })
    } catch (error) {
      if (local) {
        set({
          current: localData.trainings.get(id) ?? local,
          loading: false,
          error: null,
        })
        return
      }
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось загрузить тренировку',
      })
    }
  },

  async create(input) {
    const id = input.id ?? createLocalId()
    const training = localData.trainings.create({
      ...input,
      id,
      metadata: {
        ...(input.metadata ?? {}),
        sync: { status: 'pending', reason: pendingReason() },
      },
    })
    set((state) => ({ items: [training, ...state.items] }))
    if (isCloudMode()) scheduleCloudSync()
    return training
  },

  async update(id, input) {
    ensureLocalTrainingShell(id, get().current)
    localData.trainings.update(id, input)
    markTrainingPending(id, pendingReason())
    const current = localData.trainings.get(id)
    set((state) => ({
      current,
      items: state.items.map((item) => (item.id === id && current ? current : item)),
    }))
    if (isCloudMode()) scheduleCloudSync()
  },

  async start(id) {
    ensureLocalTrainingShell(id, get().current)
    const existing = localData.trainings.get(id)
    if (!existing) throw new Error('Тренировка не найдена')

    if (existing.status === 'finished' || existing.status === 'cancelled') {
      const training = localData.trainings.create({
        templateId: existing.templateId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        metadata: {
          sync: { status: 'pending', reason: pendingReason() },
        },
      })
      set((state) => ({
        items: [training, ...state.items],
        current: localData.trainings.get(training.id),
      }))
      if (isCloudMode()) scheduleCloudSync()
      return training
    }

    localData.trainings.update(id, {
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    })
    markTrainingPending(id, pendingReason())
    const current = localData.trainings.get(id)
    set((state) => ({
      current,
      items: state.items.map((item) => (item.id === id && current ? current : item)),
    }))
    if (isCloudMode()) scheduleCloudSync()
    return current!
  },

  async finish(id) {
    ensureLocalTrainingShell(id, get().current)
    localData.trainings.finish(id)
    markTrainingPending(id, pendingReason())
    const current = localData.trainings.get(id)
    set((state) => ({
      current,
      items: state.items.map((item) => (item.id === id && current ? current : item)),
    }))
    if (isCloudMode()) scheduleCloudSync()
  },

  async remove(id) {
    localData.trainings.remove(id)
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      current: state.current?.id === id ? null : state.current,
    }))
    if (!isCloudMode()) return

    deleteOutbox.enqueue('training', id)
    try {
      await trainingApi.remove(id)
      deleteOutbox.dequeue('training', id)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        deleteOutbox.dequeue('training', id)
        return
      }
      scheduleCloudSync()
    }
  },

  async addExercise(trainingId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.addExercise(trainingId, payload)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async updateExercise(trainingId, exerciseRowId, input) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.updateExercise(exerciseRowId, input)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async removeExercise(trainingId, exerciseRowId) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.removeExercise(exerciseRowId)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (!isCloudMode()) return
    deleteOutbox.enqueue('training-exercise', exerciseRowId)
    scheduleCloudSync()
  },

  async addSet(trainingId, exerciseId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.addSet(exerciseId, payload)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async updateSet(trainingId, setId, input) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.updateSet(setId, input)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async removeSet(trainingId, setId) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.removeSet(setId)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (!isCloudMode()) return
    deleteOutbox.enqueue('training-set', setId)
    scheduleCloudSync()
  },
}))

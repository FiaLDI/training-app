'use client'

import { create } from 'zustand'

import { useSyncNoticeStore } from '@/features/sync-trainings/model/sync-notice-store'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError, isRetriableWriteError, syncFailReason } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { localData } from '@/shared/lib/local-data'
import {
  isTrainingPendingSync,
  markTrainingPending,
  mirrorTrainingLocally,
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

const WRITE_TIMEOUT_MS = 5000

function isLocalMode() {
  return useSessionStore.getState().mode === 'local'
}

function notifyLocalSave() {
  useSyncNoticeStore.getState().notifySavedLocally()
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
          timeoutMs: WRITE_TIMEOUT_MS,
        })
        for (const item of result.items) {
          if (!localData.trainings.get(item.id)) {
            localData.trainings.upsert({
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
    set({ loading: true, error: null })
    try {
      if (isLocalMode()) {
        set({ current: localData.trainings.get(id), loading: false })
        return
      }
      try {
        const current = await trainingApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
        const mirrored = mirrorTrainingLocally(current, 'synced')
        set({ current: mirrored, loading: false })
      } catch (error) {
        const local = localData.trainings.get(id)
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
        error: error instanceof Error ? error.message : 'Не удалось загрузить тренировку',
      })
    }
  },

  async create(input) {
    const id = input.id ?? createLocalId()
    if (isLocalMode()) {
      const training = localData.trainings.create({
        ...input,
        id,
        metadata: {
          ...(input.metadata ?? {}),
          sync: { status: 'pending', reason: 'local_mode' },
        },
      })
      set((state) => ({ items: [training, ...state.items] }))
      return training
    }

    try {
      const training = await trainingApi.create({ ...input, id }, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(training, 'synced')
      set((state) => ({ items: [training, ...state.items] }))
      return training
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      const training = localData.trainings.create({
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
      set((state) => ({ items: [training, ...state.items] }))
      return training
    }
  },

  async update(id, input) {
    if (isLocalMode()) {
      const existing = localData.trainings.get(id)
      localData.trainings.update(id, {
        ...input,
        metadata: {
          ...(existing?.metadata ?? {}),
          sync: { status: 'pending', reason: 'local_mode' },
        },
      })
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
      return
    }

    try {
      await trainingApi.update(id, input, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id ? current : item)),
      }))
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(id, get().current)
      localData.trainings.update(id, input)
      markTrainingPending(id, syncFailReason(error))
      notifyLocalSave()
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
    }
  },

  async start(id) {
    if (isLocalMode()) {
      const existing = localData.trainings.get(id)
      if (!existing) throw new Error('Тренировка не найдена')
      if (existing.status === 'finished' || existing.status === 'cancelled') {
        const training = localData.trainings.create({
          templateId: existing.templateId,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
        })
        set((state) => ({
          items: [training, ...state.items],
          current: localData.trainings.get(training.id),
        }))
        return training
      }
      localData.trainings.update(id, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        metadata: {
          ...existing.metadata,
          sync: { status: 'pending', reason: 'local_mode' },
        },
      })
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
      return current!
    }

    try {
      const existing = await trainingApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
      if (existing.status === 'finished' || existing.status === 'cancelled') {
        const training = await trainingApi.create(
          {
            id: createLocalId(),
            templateId: existing.templateId,
            status: 'in_progress',
            startedAt: new Date().toISOString(),
          },
          { timeoutMs: WRITE_TIMEOUT_MS },
        )
        mirrorTrainingLocally(training, 'synced')
        set((state) => ({ items: [training, ...state.items], current: training }))
        return training
      }

      await trainingApi.update(
        id,
        { status: 'in_progress', startedAt: new Date().toISOString() },
        { timeoutMs: WRITE_TIMEOUT_MS },
      )
      const current = await trainingApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id ? current : item)),
      }))
      return current
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(id, get().current)
      const existing = localData.trainings.get(id)
      if (!existing) throw error
      if (existing.status === 'finished' || existing.status === 'cancelled') {
        const training = localData.trainings.create({
          templateId: existing.templateId,
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          metadata: {
            sync: {
              status: 'pending',
              reason: syncFailReason(error),
              failedAt: new Date().toISOString(),
            },
          },
        })
        notifyLocalSave()
        set((state) => ({
          items: [training, ...state.items],
          current: localData.trainings.get(training.id),
        }))
        return training
      }
      localData.trainings.update(id, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
      markTrainingPending(id, syncFailReason(error))
      notifyLocalSave()
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
      return current!
    }
  },

  async finish(id) {
    if (isLocalMode()) {
      localData.trainings.finish(id)
      markTrainingPending(id, 'local_mode')
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
      return
    }

    try {
      await trainingApi.update(
        id,
        { status: 'finished', finishedAt: new Date().toISOString() },
        { timeoutMs: WRITE_TIMEOUT_MS },
      )
      const current = await trainingApi.getById(id, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id ? current : item)),
      }))
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(id, get().current)
      localData.trainings.finish(id)
      markTrainingPending(id, syncFailReason(error))
      notifyLocalSave()
      const current = localData.trainings.get(id)
      set((state) => ({
        current,
        items: state.items.map((item) => (item.id === id && current ? current : item)),
      }))
    }
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

    try {
      await trainingApi.remove(id, { timeoutMs: WRITE_TIMEOUT_MS })
      localData.trainings.remove(id)
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        current: state.current?.id === id ? null : state.current,
      }))
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      throw error instanceof ApiError
        ? error
        : new Error('Не удалось удалить на сервере. Попробуйте позже.')
    }
  },

  async addExercise(trainingId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }

    if (isLocalMode()) {
      localData.trainings.addExercise(trainingId, payload)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.addExercise(trainingId, payload, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.addExercise(trainingId, payload)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },

  async updateExercise(trainingId, exerciseRowId, input) {
    const localInput = { ...input }
    const apiInput: UpdateTrainingExerciseInput & { metadata?: Record<string, unknown> } = {
      ...input,
    }
    if (input.targetWeight !== undefined) {
      delete apiInput.targetWeight
      const current = get().current?.exercises.find((item) => item.id === exerciseRowId)
      const metadata = { ...(current?.metadata ?? {}), ...(input.metadata ?? {}) }
      if (input.targetWeight == null) {
        delete metadata.targetWeight
      } else {
        metadata.targetWeight = input.targetWeight
      }
      apiInput.metadata = metadata
    }

    if (isLocalMode()) {
      localData.trainings.updateExercise(exerciseRowId, localInput)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.updateExercise(exerciseRowId, apiInput, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.updateExercise(exerciseRowId, localInput)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },

  async removeExercise(trainingId, exerciseRowId) {
    if (isLocalMode()) {
      localData.trainings.removeExercise(exerciseRowId)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.removeExercise(exerciseRowId, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.removeExercise(exerciseRowId)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },

  async addSet(trainingId, exerciseId, input) {
    const payload = { ...input, id: input.id ?? createLocalId() }

    if (isLocalMode()) {
      localData.trainings.addSet(exerciseId, payload)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.addSet(exerciseId, payload, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.addSet(exerciseId, payload)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },

  async updateSet(trainingId, setId, input) {
    if (isLocalMode()) {
      localData.trainings.updateSet(setId, input)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.updateSet(setId, input, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.updateSet(setId, input)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },

  async removeSet(trainingId, setId) {
    if (isLocalMode()) {
      localData.trainings.removeSet(setId)
      markTrainingPending(trainingId, 'local_mode')
      set({ current: localData.trainings.get(trainingId) })
      return
    }

    try {
      await trainingApi.removeSet(setId, { timeoutMs: WRITE_TIMEOUT_MS })
      const current = await trainingApi.getById(trainingId, { timeoutMs: WRITE_TIMEOUT_MS })
      mirrorTrainingLocally(current, 'synced')
      set({ current })
    } catch (error) {
      if (!isRetriableWriteError(error)) throw error
      ensureLocalTrainingShell(trainingId, get().current)
      localData.trainings.removeSet(setId)
      markTrainingPending(trainingId, syncFailReason(error))
      notifyLocalSave()
      set({ current: localData.trainings.get(trainingId) })
    }
  },
}))

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
} from '@/shared/lib/training-sync-meta'

import {
  hydrateTrainingFromTemplate,
  ensureTemplateWithExercises,
  trainingNeedsTemplateHydration,
} from '../lib/hydrate-from-template'
import {
  ingestCloudTrainingHeaders,
  pullCloudTrainingDetails,
  pullCloudTrainingDetailsForList,
  unionTrainingLists,
  type PullCloudResult,
} from '../lib/pull-cloud-training'
import { trainingApi } from '../api/training-api'
import type {
  CreateTrainingExerciseInput,
  CreateTrainingExerciseGroupInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingWithDetails,
  UpdateTrainingExerciseGroupInput,
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

function canHydrateFromTemplate(cloudPull?: PullCloudResult) {
  if (!isCloudMode()) return true
  return cloudPull === 'ok' || cloudPull === 'missing'
}

async function applyTemplateHydration(
  trainingId: string,
  cloudPull?: PullCloudResult,
): Promise<TrainingWithDetails | null> {
  const before = localData.trainings.get(trainingId)
  if (!before || !trainingNeedsTemplateHydration(before)) return before
  if (!canHydrateFromTemplate(cloudPull)) return before

  const hydrated = await hydrateTrainingFromTemplate(trainingId)
  if (hydrated && hydrated.exercises.length > 0 && isCloudMode()) {
    markTrainingPending(trainingId, pendingReason())
    scheduleCloudSync()
  }
  return hydrated
}

function mergeFetchedCloudList(
  items: Training[],
  prev: Training[],
  mode: 'replace' | 'union',
) {
  ingestCloudTrainingHeaders(items)
  const merged = mergeCloudWithPending(items)
  return mode === 'union' ? unionTrainingLists(prev, merged) : merged
}

type TrainingStore = {
  items: Training[]
  current: TrainingWithDetails | null
  loading: boolean
  error: string | null
  fetchList: (params?: { limit?: number; from?: string; to?: string }) => Promise<void>
  pullLatestFromCloud: () => Promise<void>
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
  createGroup: (
    trainingId: string,
    input: CreateTrainingExerciseGroupInput,
  ) => Promise<void>
  addExerciseToGroup: (trainingId: string, groupId: string, exerciseId: string) => Promise<void>
  updateGroup: (
    trainingId: string,
    groupId: string,
    input: UpdateTrainingExerciseGroupInput,
  ) => Promise<void>
  deleteGroup: (trainingId: string, groupId: string) => Promise<void>
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  items: [],
  current: null,
  loading: false,
  error: null,

  async fetchList(params) {
    const prevItems = get().items
    const localItems = localData.trainings.list({ from: params?.from, to: params?.to })
    const catalogKnown = localData.trainings.list().length > 0
    const hasCachedItems = prevItems.length > 0 || catalogKnown
    const items =
      localItems.length > 0 ? localItems : hasCachedItems ? prevItems : localItems
    if (isLocalMode()) {
      set({ items, loading: false, error: null })
      return
    }
    set({
      items,
      loading: !hasCachedItems,
      error: null,
    })

    try {
      const result = await trainingApi.list({
        limit: params?.limit ?? 100,
        from: params?.from,
        to: params?.to,
        timeoutMs: READ_TIMEOUT_MS,
      })
      set({
        items: mergeFetchedCloudList(result.items, prevItems, 'replace'),
        loading: false,
        error: null,
      })
      await pullCloudTrainingDetailsForList(result.items, BACKGROUND_READ_TIMEOUT_MS)
      set({ items: mergeCloudWithPending(result.items), loading: false, error: null })
    } catch (error) {
      const fallback = localData.trainings.list({ from: params?.from, to: params?.to })
      set({
        items: mergeCloudWithPending(fallback),
        loading: false,
        error: catalogKnown
          ? null
          : error instanceof Error
            ? error.message
            : 'Не удалось загрузить тренировки',
      })
    }
  },

  async pullLatestFromCloud() {
    if (!isCloudMode()) return
    try {
      const result = await trainingApi.list({
        limit: 50,
        timeoutMs: READ_TIMEOUT_MS,
      })
      set({
        items: mergeFetchedCloudList(result.items, get().items, 'union'),
        error: null,
      })
      await pullCloudTrainingDetailsForList(result.items, BACKGROUND_READ_TIMEOUT_MS)
      set({
        items: unionTrainingLists(get().items, mergeCloudWithPending(result.items)),
      })
    } catch {
      // offline / slow — keep the current list
    }
  },

  async fetchOne(id) {
    const local = localData.trainings.get(id)
    if (isLocalMode()) {
      if (local) await applyTemplateHydration(id)
      const current = localData.trainings.get(id)
      set({
        current,
        loading: false,
        error: current ? null : 'Не удалось загрузить тренировку',
      })
      return
    }

    if (local) {
      set({ current: local, loading: false, error: null })
    } else {
      set({ loading: true, error: null, current: null })
    }

    const pulled = await pullCloudTrainingDetails(
      id,
      local ? BACKGROUND_READ_TIMEOUT_MS : READ_TIMEOUT_MS,
    )
    if (pulled !== 'ok' && !localData.trainings.get(id) && !local) {
      set({
        loading: false,
        error: 'Не удалось загрузить тренировку',
      })
      return
    }

    await applyTemplateHydration(id, pulled)
    const current = localData.trainings.get(id) ?? local ?? null
    set({
      current,
      loading: false,
      error: current ? null : 'Не удалось загрузить тренировку',
    })
  },

  async create(input) {
    if (input.templateId) {
      await ensureTemplateWithExercises(input.templateId)
    }
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
    let existing = localData.trainings.get(id)
    if (!existing) throw new Error('Тренировка не найдена')

    if (isCloudMode() && (trainingNeedsTemplateHydration(existing) || existing.status === 'planned')) {
      const pulled = await pullCloudTrainingDetails(id, READ_TIMEOUT_MS)
      existing = localData.trainings.get(id) ?? existing
      if (pulled === 'error' && trainingNeedsTemplateHydration(existing)) {
        set({ current: existing, error: 'Не удалось загрузить тренировку' })
        return existing
      }
      await applyTemplateHydration(id, pulled)
      existing = localData.trainings.get(id) ?? existing
    } else {
      await applyTemplateHydration(id)
      existing = localData.trainings.get(id) ?? existing
    }

    if (existing.status === 'finished' || existing.status === 'cancelled') {
      if (existing.templateId) {
        await ensureTemplateWithExercises(existing.templateId)
      }
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
      startedAt: existing.startedAt ?? new Date().toISOString(),
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
    const dissolvedGroupId = localData.trainings
      .get(trainingId)
      ?.exercises.find((item) => item.id === exerciseRowId)?.groupId
    localData.trainings.removeExercise(exerciseRowId)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (!isCloudMode()) return
    deleteOutbox.enqueue('training-exercise', exerciseRowId)
    if (dissolvedGroupId) deleteOutbox.enqueue('training-group', dissolvedGroupId)
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

  async createGroup(trainingId, input) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.createGroup(trainingId, input)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async addExerciseToGroup(trainingId, groupId, exerciseId) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.addExerciseToGroup(groupId, exerciseId)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async updateGroup(trainingId, groupId, input) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.updateGroup(groupId, input)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (isCloudMode()) scheduleCloudSync()
  },

  async deleteGroup(trainingId, groupId) {
    ensureLocalTrainingShell(trainingId, get().current)
    localData.trainings.deleteGroup(groupId)
    markTrainingPending(trainingId, pendingReason())
    set({ current: localData.trainings.get(trainingId) })
    if (!isCloudMode()) return
    deleteOutbox.enqueue('training-group', groupId)
    scheduleCloudSync()
  },
}))

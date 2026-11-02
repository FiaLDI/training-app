'use client'

import { create } from 'zustand'

import { afterLocalCloudWrite } from '@/features/sync-trainings/model/background-sync'
import { deleteOutbox } from '@/features/sync-trainings/model/delete-outbox'
import { useSessionStore } from '@/entities/session/model/store'
import { ApiError } from '@/shared/api/client'
import { createLocalId } from '@/shared/lib/local-id'
import { coalesceFetch } from '@/shared/lib/fresh-fetch'
import {
  fetchCloudSyncState,
  persistSyncCollections,
  rememberTrainingWindow,
  trainingWindowNeedsFetch,
} from '@/shared/lib/cloud-sync-state'
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
  trainingNeedsCloudDetails,
  unionTrainingLists,
  type PullCloudResult,
} from '../lib/pull-cloud-training'
import { calendarDayRange } from '../lib/activity-calendar'
import { trainingApi } from '../api/training-api'
import type {
  CreateTrainingExerciseInput,
  CreateTrainingExerciseGroupInput,
  CreateTrainingInput,
  CreateTrainingSetInput,
  Training,
  TrainingStatus,
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

type ListPageParams = {
  page?: number
  limit?: number
  status?: TrainingStatus
}

type TrainingStore = {
  /** Calendar / dashboard window — not the /trainings list. */
  items: Training[]
  current: TrainingWithDetails | null
  loading: boolean
  error: string | null
  /** Dedicated /trainings list query — isolated from window fetches & background pull. */
  listItems: Training[]
  listTotal: number
  listPage: number
  listLimit: number
  listStatus: TrainingStatus | null
  listLoading: boolean
  listError: string | null
  fetchList: (params?: {
    page?: number
    limit?: number
    status?: TrainingStatus
    from?: string
    to?: string
    merge?: 'replace' | 'union'
  }) => Promise<void>
  fetchListPage: (params?: ListPageParams) => Promise<void>
  showLocalWindow: (params?: { from?: string; to?: string }) => void
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

function paginateLocalTrainings(params: {
  page: number
  limit: number
  status?: TrainingStatus
}) {
  let items = mergeCloudWithPending(localData.trainings.list())
  if (params.status) {
    items = items.filter((item) => item.status === params.status)
  }
  items = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = items.length
  const start = (params.page - 1) * params.limit
  return {
    items: items.slice(start, start + params.limit),
    total,
    page: params.page,
    limit: params.limit,
  }
}

function matchesListFilter(item: Training, status: TrainingStatus | null) {
  return status == null || item.status === status
}

function mapListItems(
  listItems: Training[],
  id: string,
  next: Training | null | undefined,
): Training[] {
  if (!next) {
    return listItems.filter((item) => item.id !== id)
  }
  let found = false
  const mapped = listItems.map((item) => {
    if (item.id !== id) return item
    found = true
    return next
  })
  return found ? mapped : listItems
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  items: [],
  current: null,
  loading: false,
  error: null,
  listItems: [],
  listTotal: 0,
  listPage: 1,
  listLimit: 10,
  listStatus: null,
  listLoading: false,
  listError: null,

  showLocalWindow(params) {
    const items = mergeCloudWithPending(localData.trainings.list({ from: params?.from, to: params?.to }))
    set({ items, loading: false, error: null })
  },

  async fetchList(params) {
    const key = `trainings:${params?.limit ?? 100}:${params?.from ?? ''}:${params?.to ?? ''}:${params?.status ?? ''}:${params?.page ?? 1}`
    const prevItems = get().items
    const localItems = localData.trainings.list({ from: params?.from, to: params?.to })
    const catalogKnown = localData.trainings.list().length > 0
    const hasCachedItems = prevItems.length > 0 || catalogKnown || localItems.length > 0
    const items = localItems.length > 0 ? localItems : hasCachedItems ? prevItems : localItems
    const merge = params?.merge ?? 'replace'
    if (isLocalMode()) {
      set({ items, loading: false, error: null })
      return
    }

    return coalesceFetch(key, async () => {
      set({
        items,
        loading: !hasCachedItems,
        error: null,
      })

      try {
        const result = await trainingApi.list({
          page: params?.page,
          limit: params?.limit ?? 100,
          status: params?.status,
          from: params?.from,
          to: params?.to,
          timeoutMs: READ_TIMEOUT_MS,
        })
        set({
          items: mergeFetchedCloudList(result.items, prevItems, merge),
          loading: false,
          error: null,
        })
        void fetchCloudSyncState().then((live) => {
          if (!live) return
          persistSyncCollections(live, ['trainings'])
          if (params?.from && params?.to) {
            rememberTrainingWindow(params.from, params.to, live.trainings)
          }
        })
        const detailItems = result.items.filter(trainingNeedsCloudDetails)
        if (detailItems.length === 0) return
        void (async () => {
          for (const item of detailItems) {
            await pullCloudTrainingDetails(item.id, BACKGROUND_READ_TIMEOUT_MS)
          }
          set({
            items:
              merge === 'union'
                ? unionTrainingLists(get().items, mergeCloudWithPending(result.items))
                : mergeCloudWithPending(result.items),
            loading: false,
            error: null,
          })
        })()
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
    })
  },

  async fetchListPage(params) {
    const page = Math.max(1, params?.page ?? 1)
    const limit = Math.max(1, params?.limit ?? 10)
    const status = params?.status
    const key = `trainings-list:${page}:${limit}:${status ?? ''}`
    const localPage = paginateLocalTrainings({ page, limit, status })
    const catalogKnown = localData.trainings.list().length > 0

    if (isLocalMode()) {
      set({
        listItems: localPage.items,
        listTotal: localPage.total,
        listPage: localPage.page,
        listLimit: localPage.limit,
        listStatus: status ?? null,
        listLoading: false,
        listError: null,
      })
      return
    }

    return coalesceFetch(key, async () => {
      set({
        listItems: localPage.items,
        listTotal: Math.max(get().listTotal, localPage.total),
        listPage: page,
        listLimit: limit,
        listStatus: status ?? null,
        listLoading: localPage.items.length === 0,
        listError: null,
      })

      try {
        const result = await trainingApi.list({
          page,
          limit,
          status,
          timeoutMs: READ_TIMEOUT_MS,
        })
        ingestCloudTrainingHeaders(result.items)
        const pending = localData.trainings.list().filter(isTrainingPendingSync)
        const cloudIds = new Set(result.items.map((item) => item.id))
        const pendingExtra = pending.filter(
          (item) => !cloudIds.has(item.id) && matchesListFilter(item, status ?? null),
        )
        const pageById = new Map<string, Training>()
        for (const item of result.items) {
          if (matchesListFilter(item, status ?? null)) pageById.set(item.id, item)
        }
        for (const item of pending) {
          if (pageById.has(item.id)) pageById.set(item.id, item)
        }
        const pageItems = [...pageById.values()]
        // Pending-only rows (not on server yet) stay on page 1; later pages stay server-accurate.
        const listItems = page === 1 ? [...pendingExtra, ...pageItems] : pageItems
        set({
          listItems,
          listTotal: result.total + pendingExtra.length,
          listPage: result.page,
          listLimit: result.limit,
          listStatus: status ?? null,
          listLoading: false,
          listError: null,
        })
        void fetchCloudSyncState().then((live) => {
          if (!live) return
          persistSyncCollections(live, ['trainings'])
        })
        const detailItems = result.items.filter(trainingNeedsCloudDetails)
        if (detailItems.length === 0) return
        void (async () => {
          for (const item of detailItems) {
            await pullCloudTrainingDetails(item.id, BACKGROUND_READ_TIMEOUT_MS)
          }
          const latest = get()
          if (latest.listPage !== page || latest.listLimit !== limit || latest.listStatus !== (status ?? null)) {
            return
          }
          const byId = new Map(localData.trainings.list().map((item) => [item.id, item]))
          set({
            listItems: latest.listItems.map((item) => byId.get(item.id) ?? item),
            listLoading: false,
            listError: null,
          })
        })()
      } catch (error) {
        set({
          listItems: localPage.items,
          listTotal: localPage.total,
          listPage: localPage.page,
          listLimit: localPage.limit,
          listStatus: status ?? null,
          listLoading: false,
          listError: catalogKnown
            ? null
            : error instanceof Error
              ? error.message
              : 'Не удалось загрузить тренировки',
        })
      }
    })
  },

  async pullLatestFromCloud() {
    if (!isCloudMode()) return
    const day = calendarDayRange()
    try {
      const live = await fetchCloudSyncState({ refresh: true })
      if (live && !trainingWindowNeedsFetch(day.from, day.to, live)) return
      await get().fetchList({ from: day.from, to: day.to, limit: 20, merge: 'union' })
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
    set((state) => {
      const onList =
        state.listPage === 1 && matchesListFilter(training, state.listStatus)
      return {
        items: [training, ...state.items],
        listItems: onList
          ? [training, ...state.listItems.filter((item) => item.id !== training.id)]
          : state.listItems,
        listTotal: onList && !state.listItems.some((item) => item.id === training.id)
          ? state.listTotal + 1
          : state.listTotal,
      }
    })
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
      listItems: mapListItems(state.listItems, id, current),
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
      set((state) => {
        const row = localData.trainings.get(training.id)
        const onList =
          state.listPage === 1 && row != null && matchesListFilter(row, state.listStatus)
        return {
          items: [training, ...state.items],
          current: row,
          listItems: onList
            ? [training, ...state.listItems.filter((item) => item.id !== training.id)]
            : state.listItems,
          listTotal:
            onList && !state.listItems.some((item) => item.id === training.id)
              ? state.listTotal + 1
              : state.listTotal,
        }
      })
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
      listItems: mapListItems(state.listItems, id, current),
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
      listItems: mapListItems(state.listItems, id, current),
    }))
    if (isCloudMode()) scheduleCloudSync()
  },

  async remove(id) {
    localData.trainings.remove(id)
    set((state) => {
      const removedFromList = state.listItems.some((item) => item.id === id)
      return {
        items: state.items.filter((item) => item.id !== id),
        listItems: state.listItems.filter((item) => item.id !== id),
        listTotal: removedFromList ? Math.max(0, state.listTotal - 1) : state.listTotal,
        current: state.current?.id === id ? null : state.current,
      }
    })
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

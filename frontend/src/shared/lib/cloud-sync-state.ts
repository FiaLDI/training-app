import { useSessionStore } from '@/entities/session/model/store'
import { syncApi } from '@/shared/api/sync-api'
import { createOfflineKv } from '@/shared/lib/offline-db'

export type CloudSyncState = {
  trainings: number
  templates: number
  programs: number
  exercises: number
  stats: number
}

export type CloudSyncCollection = keyof CloudSyncState

export type CloudSyncSnapshot = {
  state: CloudSyncState
  known: Partial<Record<CloudSyncCollection, true>>
  windows: Record<string, number>
  statsKeys: Record<string, number>
}

const snapshotKv = createOfflineKv<CloudSyncSnapshot>('cloud-sync-state')

let sessionState: CloudSyncState | null = null
let sessionStatePromise: Promise<CloudSyncState | null> | null = null
let visibleTrainingWindow: { from: string; to: string } | null = null
let statsScreenVisible = false
let statsReloader: (() => Promise<void>) | null = null

const EMPTY_STATE: CloudSyncState = {
  trainings: 0,
  templates: 0,
  programs: 0,
  exercises: 0,
  stats: 0,
}

export function trainingWindowKey(from: string, to: string) {
  return `${from}:${to}`
}

export function getSyncSnapshot(): CloudSyncSnapshot | null {
  const stored = snapshotKv.get()
  if (!stored?.state) return null
  return {
    state: { ...EMPTY_STATE, ...stored.state },
    known: stored.known ?? {},
    windows: stored.windows ?? {},
    statsKeys: stored.statsKeys ?? {},
  }
}

export function getSessionSyncState(): CloudSyncState | null {
  return sessionState
}

export function setVisibleTrainingWindow(from: string, to: string) {
  visibleTrainingWindow = { from, to }
}

export function getVisibleTrainingWindow() {
  return visibleTrainingWindow
}

export function setStatsScreenVisible(visible: boolean) {
  statsScreenVisible = visible
}

export function isStatsScreenVisible() {
  return statsScreenVisible
}

export function registerStatsReloader(reloader: (() => Promise<void>) | null) {
  statsReloader = reloader
}

export function reloadVisibleStats() {
  return statsReloader?.() ?? Promise.resolve()
}

function writeSnapshot(next: CloudSyncSnapshot) {
  snapshotKv.set(next)
}

export function persistSyncCollections(live: CloudSyncState, keys: CloudSyncCollection[]) {
  sessionState = live
  const current = getSyncSnapshot()
  const state = { ...(current?.state ?? EMPTY_STATE) }
  const known = { ...(current?.known ?? {}) }
  for (const key of keys) {
    state[key] = live[key]
    known[key] = true
  }
  writeSnapshot({
    state,
    known,
    windows: current?.windows ?? {},
    statsKeys: current?.statsKeys ?? {},
  })
}

export function rememberTrainingWindow(from: string, to: string, trainingsGen: number) {
  const current = getSyncSnapshot()
  writeSnapshot({
    state: current?.state ?? EMPTY_STATE,
    known: current?.known ?? {},
    windows: { ...(current?.windows ?? {}), [trainingWindowKey(from, to)]: trainingsGen },
    statsKeys: current?.statsKeys ?? {},
  })
}

export function rememberStatsKey(key: string, statsGen: number) {
  const current = getSyncSnapshot()
  writeSnapshot({
    state: current?.state ?? EMPTY_STATE,
    known: current?.known ?? {},
    windows: current?.windows ?? {},
    statsKeys: { ...(current?.statsKeys ?? {}), [key]: statsGen },
  })
}

export function collectionNeedsFetch(
  collection: CloudSyncCollection,
  live: CloudSyncState | null,
): boolean {
  if (!live) return true
  const snap = getSyncSnapshot()
  if (!snap?.known[collection]) return true
  return live[collection] > snap.state[collection]
}

export function trainingWindowNeedsFetch(
  from: string,
  to: string,
  live: CloudSyncState | null,
): boolean {
  if (!live) return true
  const snap = getSyncSnapshot()
  const listedGen = snap?.windows[trainingWindowKey(from, to)]
  if (listedGen == null) return true
  return live.trainings > listedGen
}

export function statsKeyNeedsFetch(key: string, live: CloudSyncState | null): boolean {
  if (!live) return true
  const snap = getSyncSnapshot()
  const listedGen = snap?.statsKeys[key]
  if (listedGen == null) return true
  return live.stats > listedGen
}

export async function fetchCloudSyncState(
  options: { refresh?: boolean; timeoutMs?: number } = {},
): Promise<CloudSyncState | null> {
  if (useSessionStore.getState().mode === 'local') return null
  if (!options.refresh && sessionState) return sessionState
  if (sessionStatePromise) return sessionStatePromise
  const timeoutMs = options.timeoutMs ?? 4000
  sessionStatePromise = (async () => {
    try {
      const state = await syncApi.state({ timeoutMs })
      sessionState = state
      return state
    } catch {
      return sessionState
    } finally {
      sessionStatePromise = null
    }
  })()
  return sessionStatePromise
}

export function resetCloudSyncState() {
  sessionState = null
  sessionStatePromise = null
  visibleTrainingWindow = null
  statsScreenVisible = false
  statsReloader = null
  snapshotKv.remove()
}

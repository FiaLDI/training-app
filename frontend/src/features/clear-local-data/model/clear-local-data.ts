import { useBodyMeasurementStore } from '@/entities/body-measurement/model/store'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { deleteOutbox } from '@/features/sync-trainings/model/delete-outbox'
import { useSyncNoticeStore } from '@/features/sync-trainings/model/sync-notice-store'
import { catalogSync } from '@/shared/lib/catalog-sync'
import { clearAllLocalData, localData } from '@/shared/lib/local-data'
import { listPendingTemplates } from '@/shared/lib/template-sync-meta'
import { listPendingTrainings } from '@/shared/lib/training-sync-meta'

export function resetEntityStores() {
  useTrainingStore.setState({
    items: [],
    current: null,
    loading: false,
    error: null,
  })
  useTemplateStore.setState({
    items: [],
    current: null,
    loading: false,
    error: null,
  })
  useExerciseStore.setState({
    items: [],
    total: 0,
    current: null,
    loading: false,
    error: null,
  })
  useProgramStore.setState({
    items: [],
    current: null,
    loading: false,
    error: null,
  })
  useBodyMeasurementStore.setState({
    items: [],
    loading: false,
    error: null,
  })
  useSyncNoticeStore.getState().dismissBanner()
}

export function clearPendingLocalChanges() {
  for (const training of listPendingTrainings()) {
    localData.trainings.remove(training.id)
  }
  for (const template of listPendingTemplates()) {
    localData.templates.remove(template.id)
  }

  for (const item of catalogSync.listPending()) {
    const exercise = localData.exercises.get(item.id)
    if (!exercise?.metadata?.catalogSyncedAt) {
      localData.exercises.remove(item.id)
    }
  }
  catalogSync.clearOutbox()
  deleteOutbox.clear()
}

export async function clearAllLocalDataAndReset(refreshFromServer = false) {
  clearAllLocalData()
  resetEntityStores()
  if (refreshFromServer) {
    await catalogSync.mergeFromServer()
  }
}

export async function clearPendingAndReset(refreshFromServer = false) {
  clearPendingLocalChanges()
  resetEntityStores()
  if (refreshFromServer) {
    await catalogSync.mergeFromServer()
  }
}

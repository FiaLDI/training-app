import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import { markTemplatePending } from '@/shared/lib/template-sync-meta'
import {
  getTrainingSyncMeta,
  markTrainingPending,
} from '@/shared/lib/training-sync-meta'

import { getPendingSyncSummary, type PendingSyncSummary } from './pending-summary'

function hasCatalogSyncedAt(metadata: Record<string, unknown> | undefined): boolean {
  return typeof metadata?.catalogSyncedAt === 'string' && metadata.catalogSyncedAt.length > 0
}

/**
 * When entering cloud mode, queue local catalog items that were never synced
 * and mark templates/trainings without a successful sync so the sync UI appears.
 */
export function backfillPendingSync(): PendingSyncSummary {
  if (typeof window === 'undefined') {
    return { trainings: 0, templates: 0, exercises: 0, equipment: 0, total: 0 }
  }

  for (const exercise of localData.exercises.list()) {
    if (!hasCatalogSyncedAt(exercise.metadata)) {
      catalogSync.enqueueUpsert('exercise', exercise.id)
    }
  }

  for (const equipment of localData.equipment.list()) {
    if (!hasCatalogSyncedAt(equipment.metadata)) {
      catalogSync.enqueueUpsert('equipment', equipment.id)
    }
  }

  for (const template of localData.templates.list()) {
    const sync = getTrainingSyncMeta(template.metadata)
    if (!sync || sync.status !== 'synced') {
      markTemplatePending(template.id, sync?.reason ?? 'local_mode')
    }
  }

  for (const training of localData.trainings.list()) {
    const sync = getTrainingSyncMeta(training.metadata)
    if (!sync || sync.status !== 'synced') {
      markTrainingPending(training.id, sync?.reason ?? 'local_mode')
    }
  }

  return getPendingSyncSummary()
}

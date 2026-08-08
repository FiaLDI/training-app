import type { WorkoutTemplate, WorkoutTemplateWithExercises } from '@/entities/template/model/types'
import type { TrainingSyncMeta } from '@/entities/training/model/types'
import { localData } from '@/shared/lib/local-data'
import { getTrainingSyncMeta } from '@/shared/lib/training-sync-meta'

export function isTemplatePendingSync(template: WorkoutTemplate): boolean {
  const sync = getTrainingSyncMeta(template.metadata)
  return !sync || sync.status !== 'synced'
}

export function markTemplatePending(
  templateId: string,
  reason: NonNullable<TrainingSyncMeta['reason']>,
  error?: string,
): WorkoutTemplate | null {
  const current = localData.templates.get(templateId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'pending',
    reason,
    failedAt: new Date().toISOString(),
    ...(error ? { error } : {}),
  }
  return localData.templates.update(templateId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTemplateSynced(templateId: string): WorkoutTemplate | null {
  const current = localData.templates.get(templateId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'synced',
    serverSyncedAt: new Date().toISOString(),
  }
  return localData.templates.update(templateId, {
    metadata: { ...current.metadata, sync },
  })
}

export function markTemplateSyncError(templateId: string, error: string): WorkoutTemplate | null {
  const current = localData.templates.get(templateId)
  if (!current) return null
  const sync: TrainingSyncMeta = {
    status: 'error',
    error,
    failedAt: new Date().toISOString(),
    reason: getTrainingSyncMeta(current.metadata)?.reason,
  }
  return localData.templates.update(templateId, {
    metadata: { ...current.metadata, sync },
  })
}

export function mirrorTemplateLocally(
  template: WorkoutTemplateWithExercises,
  syncStatus: TrainingSyncMeta['status'] = 'synced',
): WorkoutTemplateWithExercises {
  const sync: TrainingSyncMeta =
    syncStatus === 'synced'
      ? { status: 'synced', serverSyncedAt: new Date().toISOString() }
      : { status: syncStatus, reason: 'network' }

  localData.templates.upsert({
    id: template.id,
    name: template.name,
    description: template.description,
    metadata: { ...template.metadata, sync },
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  })

  for (const exercise of template.exercises) {
    localData.templates.upsertExercise(exercise)
  }

  return localData.templates.get(template.id) ?? {
    ...template,
    metadata: { ...template.metadata, sync },
  }
}

export function listPendingTemplates(): WorkoutTemplateWithExercises[] {
  return localData.templates
    .list()
    .filter(isTemplatePendingSync)
    .map((item) => localData.templates.get(item.id))
    .filter((item): item is WorkoutTemplateWithExercises => item != null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

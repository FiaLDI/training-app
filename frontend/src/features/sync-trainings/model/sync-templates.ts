import { templateApi } from '@/entities/template/api/template-api'
import type {
  TemplateExercise,
  WorkoutTemplateWithExercises,
} from '@/entities/template/model/types'
import { ApiError } from '@/shared/api/client'
import { localData } from '@/shared/lib/local-data'
import {
  listPendingTemplates,
  markTemplateSyncError,
  markTemplateSynced,
  mirrorTemplateLocally,
} from '@/shared/lib/template-sync-meta'

export type SyncTemplateProgress = {
  templateId: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function stripSyncMeta(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== 'sync'))
}

async function ensureTemplateShell(template: WorkoutTemplateWithExercises) {
  let exists = false
  try {
    await templateApi.getById(template.id)
    exists = true
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }

  const payload = {
    name: template.name,
    description: template.description,
    metadata: stripSyncMeta(template.metadata),
  }

  if (exists) {
    await templateApi.update(template.id, payload)
    return
  }

  await templateApi.create({
    id: template.id,
    ...payload,
  })
}

async function upsertTemplateExercise(templateId: string, exercise: TemplateExercise) {
  const updateBody = {
    exerciseOrder: exercise.exerciseOrder,
    targetSets: exercise.targetSets,
    isWarmup: exercise.isWarmup,
    minReps: exercise.minReps,
    maxReps: exercise.maxReps,
    targetWeight: exercise.targetWeight,
    restSeconds: exercise.restSeconds,
    notes: exercise.notes,
    metadata: exercise.metadata,
  }

  try {
    await templateApi.updateExercise(exercise.id, updateBody)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
    await templateApi.addExercise(templateId, {
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      ...updateBody,
    })
  }
}

async function reconcileTemplateRemovals(template: WorkoutTemplateWithExercises) {
  const remote = await templateApi.getById(template.id)
  const localIds = new Set(template.exercises.map((item) => item.id))
  for (const exercise of remote.exercises) {
    if (!localIds.has(exercise.id)) {
      await templateApi.removeExercise(exercise.id)
    }
  }
}

export async function syncTemplates(
  templateIds: string[],
  onProgress?: (items: SyncTemplateProgress[]) => void,
): Promise<SyncTemplateProgress[]> {
  const progress: SyncTemplateProgress[] = templateIds.map((templateId) => ({
    templateId,
    status: 'pending',
  }))
  const emit = () => onProgress?.(progress.map((item) => ({ ...item })))

  for (const item of progress) {
    item.status = 'uploading'
    emit()

    const detailed = localData.templates.get(item.templateId)
    if (!detailed) {
      item.status = 'error'
      item.error = 'План не найден локально'
      emit()
      continue
    }

    try {
      await uploadTemplate(detailed)
      markTemplateSynced(detailed.id)
      item.status = 'done'
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось отправить'
      markTemplateSyncError(detailed.id, message)
      item.status = 'error'
      item.error = message
    }
    emit()
  }

  return progress
}

async function uploadTemplate(template: WorkoutTemplateWithExercises) {
  await ensureTemplateShell(template)

  for (const exercise of template.exercises) {
    await upsertTemplateExercise(template.id, exercise)
  }

  await reconcileTemplateRemovals(template)

  const refreshed = localData.templates.get(template.id)
  if (refreshed) mirrorTemplateLocally(refreshed, 'synced')
}

export { listPendingTemplates }

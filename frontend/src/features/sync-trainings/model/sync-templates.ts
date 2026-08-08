import { templateApi } from '@/entities/template/api/template-api'
import type { WorkoutTemplateWithExercises } from '@/entities/template/model/types'
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
  await templateApi.create({
    id: template.id,
    name: template.name,
    description: template.description,
    metadata: Object.fromEntries(
      Object.entries(template.metadata).filter(([key]) => key !== 'sync'),
    ),
  })

  for (const exercise of template.exercises) {
    await templateApi.addExercise(template.id, {
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseOrder: exercise.exerciseOrder,
      targetSets: exercise.targetSets,
      isWarmup: exercise.isWarmup,
      minReps: exercise.minReps,
      maxReps: exercise.maxReps,
      targetWeight: exercise.targetWeight,
      restSeconds: exercise.restSeconds,
      notes: exercise.notes,
      metadata: exercise.metadata,
    })
  }

  const refreshed = localData.templates.get(template.id)
  if (refreshed) mirrorTemplateLocally(refreshed, 'synced')
}

export { listPendingTemplates }

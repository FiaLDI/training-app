import { catalogSync } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import { listPendingTemplates } from '@/shared/lib/template-sync-meta'
import { listPendingTrainings } from '@/shared/lib/training-sync-meta'

export type PendingSyncSummary = {
  trainings: number
  templates: number
  exercises: number
  equipment: number
  total: number
}

export function getPendingSyncSummary(): PendingSyncSummary {
  const catalog = catalogSync.listPending()
  const trainings = listPendingTrainings().length
  const templates = listPendingTemplates().length
  const exercises = catalog.filter((item) => item.entity === 'exercise').length
  const equipment = catalog.filter((item) => item.entity === 'equipment').length
  return {
    trainings,
    templates,
    exercises,
    equipment,
    total: trainings + templates + exercises + equipment,
  }
}

export function formatPendingSummary(summary: PendingSyncSummary): string {
  const parts: string[] = []
  if (summary.templates > 0) {
    parts.push(summary.templates === 1 ? '1 план' : `${summary.templates} планов`)
  }
  if (summary.trainings > 0) {
    parts.push(
      summary.trainings === 1 ? '1 тренировка' : `${summary.trainings} тренировок`,
    )
  }
  if (summary.exercises > 0) {
    parts.push(
      summary.exercises === 1 ? '1 упражнение' : `${summary.exercises} упражнений`,
    )
  }
  if (summary.equipment > 0) {
    parts.push(
      summary.equipment === 1 ? '1 инвентарь' : `${summary.equipment} позиций инвентаря`,
    )
  }
  return parts.join(', ')
}

export function exerciseNamesForTraining(trainingId: string): string[] {
  const training = localData.trainings.get(trainingId)
  if (!training) return []
  return training.exercises.map((item) => {
    const exercise = localData.exercises.get(item.exerciseId)
    return exercise?.name ?? 'Упражнение'
  })
}

export function exerciseNamesForTemplate(templateId: string): string[] {
  const template = localData.templates.get(templateId)
  if (!template) return []
  return template.exercises.map((item) => {
    const exercise = localData.exercises.get(item.exerciseId)
    return exercise?.name ?? 'Упражнение'
  })
}

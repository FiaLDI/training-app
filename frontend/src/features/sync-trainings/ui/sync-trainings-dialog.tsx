'use client'

import { useEffect, useMemo, useState } from 'react'

import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { catalogSync, type PendingCatalogItem } from '@/shared/lib/catalog-sync'
import { localData } from '@/shared/lib/local-data'
import {
  getTrainingSyncMeta,
  syncReasonLabel,
} from '@/shared/lib/training-sync-meta'
import { Button } from '@/shared/ui/button'

import {
  exerciseNamesForTemplate,
  exerciseNamesForTraining,
} from '../model/pending-summary'
import {
  listPendingTemplates,
  syncTemplates,
  type SyncTemplateProgress,
} from '../model/sync-templates'
import {
  listPendingTrainings,
  syncTrainings,
  type SyncTrainingProgress,
} from '../model/sync-trainings'

type Props = {
  open: boolean
  onClose: () => void
  onCompleted?: () => void
}

type CatalogProgress = {
  key: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

function formatWhen(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function catalogKey(item: PendingCatalogItem) {
  return `${item.entity}:${item.id}`
}

function catalogOpLabel(item: PendingCatalogItem) {
  if (item.op === 'delete') return 'удаление'
  return item.entity === 'exercise' ? 'упражнение' : 'инвентарь'
}

export function SyncTrainingsDialog({ open, onClose, onCompleted }: Props) {
  const pendingTrainings = useMemo(() => (open ? listPendingTrainings() : []), [open])
  const pendingTemplates = useMemo(() => (open ? listPendingTemplates() : []), [open])
  const pendingCatalog = useMemo(() => (open ? catalogSync.listPending() : []), [open])

  const [selectedTrainings, setSelectedTrainings] = useState<Record<string, boolean>>({})
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, boolean>>({})
  const [selectedCatalog, setSelectedCatalog] = useState<Record<string, boolean>>({})

  const [trainingProgress, setTrainingProgress] = useState<SyncTrainingProgress[] | null>(null)
  const [templateProgress, setTemplateProgress] = useState<SyncTemplateProgress[] | null>(null)
  const [catalogProgress, setCatalogProgress] = useState<CatalogProgress[] | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!open) {
      setTrainingProgress(null)
      setTemplateProgress(null)
      setCatalogProgress(null)
      setRunning(false)
      return
    }
    const nextTrainings: Record<string, boolean> = {}
    for (const item of listPendingTrainings()) nextTrainings[item.id] = true
    setSelectedTrainings(nextTrainings)

    const nextTemplates: Record<string, boolean> = {}
    for (const item of listPendingTemplates()) nextTemplates[item.id] = true
    setSelectedTemplates(nextTemplates)

    const nextCatalog: Record<string, boolean> = {}
    for (const item of catalogSync.listPending()) nextCatalog[catalogKey(item)] = true
    setSelectedCatalog(nextCatalog)
  }, [open])

  if (!open) return null

  const selectedTrainingIds = pendingTrainings
    .filter((item) => selectedTrainings[item.id])
    .map((item) => item.id)
  const selectedTemplateIds = pendingTemplates
    .filter((item) => selectedTemplates[item.id])
    .map((item) => item.id)
  const selectedCatalogItems = pendingCatalog.filter(
    (item) => selectedCatalog[catalogKey(item)],
  )
  const canSubmit =
    !running &&
    (selectedTrainingIds.length > 0 ||
      selectedTemplateIds.length > 0 ||
      selectedCatalogItems.length > 0)

  async function onSubmit() {
    if (!canSubmit) return
    setRunning(true)

    const requiredTemplateIds = new Set(selectedTemplateIds)
    for (const trainingId of selectedTrainingIds) {
      const training = localData.trainings.get(trainingId)
      if (training?.templateId && localData.templates.get(training.templateId)) {
        requiredTemplateIds.add(training.templateId)
        setSelectedTemplates((state) => ({ ...state, [training.templateId!]: true }))
      }
    }

    const requiredExerciseIds = new Set<string>()
    for (const trainingId of selectedTrainingIds) {
      const training = localData.trainings.get(trainingId)
      for (const exercise of training?.exercises ?? []) {
        requiredExerciseIds.add(exercise.exerciseId)
      }
    }
    for (const templateId of requiredTemplateIds) {
      const template = localData.templates.get(templateId)
      for (const exercise of template?.exercises ?? []) {
        requiredExerciseIds.add(exercise.exerciseId)
      }
    }

    const catalogQueueMap = new Map(
      selectedCatalogItems.map((item) => [catalogKey(item), item]),
    )
    for (const item of pendingCatalog) {
      if (item.entity === 'exercise' && requiredExerciseIds.has(item.id)) {
        catalogQueueMap.set(catalogKey(item), item)
        setSelectedCatalog((state) => ({ ...state, [catalogKey(item)]: true }))
      }
    }
    const catalogQueue = [...catalogQueueMap.values()]
    const templateQueue = [...requiredTemplateIds].filter((id) =>
      pendingTemplates.some((item) => item.id === id),
    )

    const catProgress: CatalogProgress[] = catalogQueue.map((item) => ({
      key: catalogKey(item),
      status: 'pending',
    }))
    setCatalogProgress(catalogQueue.length ? catProgress : null)

    if (catalogQueue.length > 0) {
      for (const entry of catProgress) entry.status = 'uploading'
      setCatalogProgress(catProgress.map((item) => ({ ...item })))

      await catalogSync.flush(
        (item, ok, error) => {
          const row = catProgress.find((entry) => entry.key === catalogKey(item))
          if (!row) return
          row.status = ok ? 'done' : 'error'
          row.error = error
          setCatalogProgress(catProgress.map((entry) => ({ ...entry })))
        },
        catalogQueue.map((item) => ({ entity: item.entity, id: item.id })),
      )

      for (const row of catProgress) {
        if (row.status === 'uploading' || row.status === 'pending') {
          const stillPending = catalogSync
            .listPending()
            .some((item) => catalogKey(item) === row.key)
          row.status = stillPending ? 'error' : 'done'
          if (stillPending) row.error = row.error ?? 'Не удалось отправить'
        }
      }
      setCatalogProgress(catProgress.map((entry) => ({ ...entry })))
    }

    if (templateQueue.length > 0) {
      await syncTemplates(templateQueue, setTemplateProgress)
    }

    if (selectedTrainingIds.length > 0) {
      await syncTrainings(selectedTrainingIds, setTrainingProgress, {
        skipCatalogFlush: true,
      })
    }

    setRunning(false)
    onCompleted?.()
  }

  const catalogDone = catalogProgress?.filter((item) => item.status === 'done').length ?? 0
  const templateDone = templateProgress?.filter((item) => item.status === 'done').length ?? 0
  const trainingDone = trainingProgress?.filter((item) => item.status === 'done').length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        aria-labelledby="sync-trainings-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
      >
        <h2
          id="sync-trainings-title"
          className="font-[family-name:var(--font-display)] text-xl text-[var(--foreground)]"
        >
          Отправить на сервер
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Ниже всё, что сейчас только на этом устройстве. Отметьте, что отправить в аккаунт.
          Недельные программы и таймер отдыха пока не отправляются.
        </p>

        <section className="mt-5">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Каталог
            {pendingCatalog.length > 0 ? (
              <span className="ml-2 font-normal text-[var(--muted)]">
                ({pendingCatalog.length})
              </span>
            ) : null}
          </h3>
          <ul className="mt-2 space-y-2">
            {pendingCatalog.length === 0 ? (
              <li className="rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--muted)]">
                Нет новых упражнений или инвентаря в очереди
              </li>
            ) : (
              pendingCatalog.map((item) => {
                const key = catalogKey(item)
                const itemProgress = catalogProgress?.find((entry) => entry.key === key)
                return (
                  <li
                    key={key}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selectedCatalog[key])}
                        disabled={running}
                        onChange={(event) =>
                          setSelectedCatalog((state) => ({
                            ...state,
                            [key]: event.target.checked,
                          }))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[var(--foreground)]">
                          {item.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {catalogOpLabel(item)}
                          {item.op === 'delete'
                            ? ' · будет удалено на сервере'
                            : ' · будет создано/обновлено'}
                        </span>
                        {itemProgress ? (
                          <ProgressLine status={itemProgress.status} error={itemProgress.error} />
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Планы
            {pendingTemplates.length > 0 ? (
              <span className="ml-2 font-normal text-[var(--muted)]">
                ({pendingTemplates.length})
              </span>
            ) : null}
          </h3>
          <ul className="mt-2 space-y-2">
            {pendingTemplates.length === 0 ? (
              <li className="rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--muted)]">
                Нет планов для отправки
              </li>
            ) : (
              pendingTemplates.map((template) => {
                const sync = getTrainingSyncMeta(template.metadata)
                const names = exerciseNamesForTemplate(template.id)
                const itemProgress = templateProgress?.find(
                  (entry) => entry.templateId === template.id,
                )
                return (
                  <li
                    key={template.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selectedTemplates[template.id])}
                        disabled={running}
                        onChange={(event) =>
                          setSelectedTemplates((state) => ({
                            ...state,
                            [template.id]: event.target.checked,
                          }))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-[var(--foreground)]">
                          {template.name}
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {template.exercises.length} упр. · {syncReasonLabel(sync?.reason)}
                        </span>
                        {names.length > 0 ? (
                          <span className="mt-1 block text-xs text-[var(--foreground)]/80">
                            Упражнения: {names.join(', ')}
                          </span>
                        ) : null}
                        {itemProgress ? (
                          <ProgressLine status={itemProgress.status} error={itemProgress.error} />
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            Тренировки
            {pendingTrainings.length > 0 ? (
              <span className="ml-2 font-normal text-[var(--muted)]">
                ({pendingTrainings.length})
              </span>
            ) : null}
          </h3>
          <ul className="mt-2 space-y-2">
            {pendingTrainings.length === 0 ? (
              <li className="rounded-xl border border-[var(--border)] px-3 py-3 text-sm text-[var(--muted)]">
                Нет тренировок для отправки
              </li>
            ) : (
              pendingTrainings.map((training) => {
                const sync = getTrainingSyncMeta(training.metadata)
                const setsCount = training.exercises.reduce(
                  (sum, exercise) => sum + exercise.sets.length,
                  0,
                )
                const names = exerciseNamesForTraining(training.id)
                const itemProgress = trainingProgress?.find(
                  (entry) => entry.trainingId === training.id,
                )
                const planName = training.templateId
                  ? localData.templates.get(training.templateId)?.name
                  : null
                return (
                  <li
                    key={training.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 px-3 py-3"
                  >
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={Boolean(selectedTrainings[training.id])}
                        disabled={running}
                        onChange={(event) =>
                          setSelectedTrainings((state) => ({
                            ...state,
                            [training.id]: event.target.checked,
                          }))
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <TrainingStatusBadge status={training.status} />
                          <span className="text-sm text-[var(--foreground)]">
                            {formatWhen(
                              training.startedAt ?? training.scheduledAt ?? training.createdAt,
                            )}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {training.exercises.length} упр. · {setsCount} подх. ·{' '}
                          {syncReasonLabel(sync?.reason)}
                          {planName ? ` · план «${planName}»` : ''}
                        </span>
                        {names.length > 0 ? (
                          <span className="mt-1 block text-xs text-[var(--foreground)]/80">
                            Упражнения: {names.join(', ')}
                          </span>
                        ) : null}
                        {itemProgress ? (
                          <ProgressLine status={itemProgress.status} error={itemProgress.error} />
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        {(trainingProgress || templateProgress || catalogProgress) && (
          <p className="mt-3 text-sm text-[var(--foreground)]">
            Каталог: {catalogDone}/{catalogProgress?.length ?? 0}
            {' · '}
            Планы: {templateDone}/{templateProgress?.length ?? 0}
            {' · '}
            Тренировки: {trainingDone}/{trainingProgress?.length ?? 0}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={running}>
            {trainingProgress || templateProgress || catalogProgress ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit}>
            {running ? 'Отправка…' : 'Отправить выбранные'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ProgressLine({
  status,
  error,
}: {
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}) {
  return (
    <span className="mt-1 block text-xs">
      {status === 'uploading' && 'Отправка…'}
      {status === 'done' && <span className="text-[var(--accent)]">Готово</span>}
      {status === 'error' && (
        <span className="text-red-300">Ошибка: {error ?? 'не удалось'}</span>
      )}
      {status === 'pending' && 'В очереди'}
    </span>
  )
}

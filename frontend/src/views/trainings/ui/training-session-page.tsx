'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'

import { AddTrainingExerciseModal } from '@/features/add-training-exercise/ui/add-training-exercise-modal'
import { EditSetRow } from '@/features/edit-set/ui/edit-set-row'
import { EditTrainingExerciseRow } from '@/features/edit-training-exercise/ui/edit-training-exercise-row'
import { EditTrainingForm } from '@/features/edit-training/ui/edit-training-form'
import { LogSetForm } from '@/features/log-set/ui/log-set-form'
import { resolveRestSeconds } from '@/features/rest-timer/lib/resolve-rest-seconds'
import { useRestTimerStore } from '@/features/rest-timer/model/store'
import { RestTimerBar } from '@/features/rest-timer/ui/rest-timer-bar'
import {
  pauseBackgroundSync,
  resumeBackgroundSync,
} from '@/features/sync-trainings/model/background-sync'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { usePreferencesStore } from '@/entities/preferences/model/store'
import { SessionExerciseMedia } from '@/entities/exercise/ui/session-exercise-media'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import {
  formatKg,
  lastWorkingSetWeight,
  workingSetMaxWeight,
} from '@/entities/training/lib/session-weight'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { DropdownItem, DropdownMenu } from '@/shared/ui/dropdown-menu'
import { EmptyState } from '@/shared/ui/empty-state'
import { DetailSkeleton } from '@/shared/ui/skeleton'

function targetWeightFrom(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.targetWeight
  return typeof value === 'number' ? value : null
}

function PreviousMaxHint({
  previousMaxWeight,
  currentMaxWeight,
}: {
  previousMaxWeight: number | null
  currentMaxWeight: number | null
}) {
  if (previousMaxWeight == null && currentMaxWeight == null) return null

  const delta =
    previousMaxWeight != null && currentMaxWeight != null
      ? currentMaxWeight - previousMaxWeight
      : null

  return (
    <p className="mt-3 text-sm text-[var(--muted)]">
      {previousMaxWeight != null ? (
        <>Прошлый макс {formatKg(previousMaxWeight)} кг</>
      ) : (
        'Нет прошлого веса'
      )}
      {currentMaxWeight != null ? (
        <>
          {' · '}сейчас {formatKg(currentMaxWeight)} кг
          {delta != null && delta !== 0 ? (
            <span className={delta > 0 ? 'text-emerald-300' : 'text-amber-300'}>
              {' '}
              ({delta > 0 ? '+' : ''}
              {formatKg(delta)})
            </span>
          ) : null}
        </>
      ) : null}
    </p>
  )
}

function ExerciseStepper({
  name,
  index,
  total,
  onPrev,
  onNext,
  onSelect,
}: {
  name: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onSelect: (index: number) => void
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={index <= 0}
          onClick={onPrev}
          aria-label="Предыдущее упражнение"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:border-[var(--accent)]/40 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-wrap break-words font-[family-name:var(--font-display)] text-2xl tracking-tight">
            {name}
          </h1>
          <p className="mt-1 text-sm tabular-nums text-[var(--muted)]">
            {index + 1} / {total}
          </p>
        </div>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={onNext}
          aria-label="Следующее упражнение"
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:border-[var(--accent)]/40 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-6" />
        </button>
      </div>
      {total > 1 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {Array.from({ length: total }, (_, itemIndex) => (
            <button
              key={itemIndex}
              type="button"
              aria-label={`Упражнение ${itemIndex + 1}`}
              aria-current={itemIndex === index ? 'page' : undefined}
              onClick={() => onSelect(itemIndex)}
              className="flex h-6 items-center justify-center px-0.5"
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  itemIndex === index
                    ? 'w-6 bg-[var(--accent)]'
                    : 'w-1.5 bg-[var(--border)]',
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type Props = {
  id: string
}

export function TrainingSessionPage({ id }: Props) {
  const router = useRouter()
  const current = useTrainingStore((s) => s.current)
  const loading = useTrainingStore((s) => s.loading)
  const error = useTrainingStore((s) => s.error)
  const fetchOne = useTrainingStore((s) => s.fetchOne)
  const start = useTrainingStore((s) => s.start)
  const finish = useTrainingStore((s) => s.finish)
  const remove = useTrainingStore((s) => s.remove)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const autoStartRestTimer = usePreferencesStore((s) => s.autoStartRestTimer)
  const restTimerSkipWarmup = usePreferencesStore((s) => s.restTimerSkipWarmup)
  const defaultRestSeconds = usePreferencesStore((s) => s.defaultRestSeconds)
  const startRestTimer = useRestTimerStore((s) => s.start)
  const dismissRestTimer = useRestTimerStore((s) => s.dismiss)

  function handleSetLogged({ isWarmup }: { isWarmup: boolean }) {
    if (!autoStartRestTimer || !current || !activeExerciseId) return
    if (isWarmup && restTimerSkipWarmup) return

    const exercise = current.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return

    startRestTimer(resolveRestSeconds(exercise, defaultRestSeconds))
  }

  useEffect(() => {
    return () => {
      dismissRestTimer()
    }
  }, [dismissRestTimer])

  useEffect(() => {
    void fetchOne(id)
    void fetchExercises()
    void fetchTemplates()
  }, [id, fetchOne, fetchExercises, fetchTemplates])

  useEffect(() => {
    pauseBackgroundSync()
    return () => {
      resumeBackgroundSync()
    }
  }, [])

  useEffect(() => {
    const items = current?.exercises ?? []
    const sorted = [...items].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
    setActiveExerciseId((currentId) => {
      if (sorted.length === 0) return null
      if (currentId && sorted.some((item) => item.id === currentId)) return currentId
      const firstIncomplete = sorted.find((item) => {
        const done = item.sets.filter((set) => !set.isWarmup && set.completed).length
        return done < item.targetSets
      })
      return firstIncomplete?.id ?? sorted[0].id
    })
  }, [current?.exercises])

  async function handleFinish() {
    if (finishing) return

    setFinishing(true)
    try {
      await finish(id)
      setFinishConfirmOpen(false)
      router.push('/')
    } finally {
      setFinishing(false)
    }
  }

  async function handleRemove() {
    if (removing) return

    setRemoving(true)
    try {
      await remove(id)
      setRemoveConfirmOpen(false)
      router.push('/week')
    } finally {
      setRemoving(false)
    }
  }

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      await start(id)
      router.refresh()
    } finally {
      setStarting(false)
    }
  }

  const exerciseName = (exerciseId: string) =>
    exercises.find((item) => item.id === exerciseId)?.name ?? exerciseId.slice(0, 8)

  if (loading && !current) {
    return <DetailSkeleton />
  }

  if (error || !current) {
    return <p className="text-sm text-red-300">{error ?? 'Тренировка не найдена'}</p>
  }

  const canEditStructure = current.status === 'in_progress' || current.status === 'planned'
  const canRemoveExercise =
    current.status === 'in_progress' ||
    current.status === 'planned' ||
    current.status === 'finished'
  const canEditSets =
    current.status === 'in_progress' ||
    current.status === 'planned' ||
    current.status === 'finished'
  const sortedExercises = [...current.exercises].sort(
    (a, b) => a.exerciseOrder - b.exerciseOrder,
  )
  const activeIndex = Math.max(
    0,
    sortedExercises.findIndex((item) => item.id === activeExerciseId),
  )
  const activeExercise = sortedExercises[activeIndex] ?? null
  const activeCatalogExercise = activeExercise
    ? exercises.find((item) => item.id === activeExercise.exerciseId) ?? null
    : null
  const title =
    (current.templateId
      ? templates.find((item) => item.id === current.templateId)?.name
      : null) ?? 'Тренировка'
  const whenLabel =
    current.status === 'planned' && current.scheduledAt
      ? `Запланировано ${new Date(current.scheduledAt).toLocaleString('ru-RU')}`
      : current.startedAt
        ? `Начата ${new Date(current.startedAt).toLocaleString('ru-RU')}`
        : 'Не начата'

  return (
    <div className="mx-auto max-w-lg pb-24">
      <header className="mb-6 flex items-center gap-2">
        <Link
          href="/week"
          aria-label="Неделя"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-wrap break-words font-[family-name:var(--font-display)] text-sm text-[var(--foreground)]">
            {title}
          </p>
          <p className="truncate text-xs text-[var(--muted)]">{whenLabel}</p>
        </div>
        <DropdownMenu
          ariaLabel="Ещё"
          trigger={<MoreHorizontal className="size-5" />}
          triggerClassName="inline-flex size-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
        >
          {(close) => (
            <>
              {canEditStructure ? (
                <DropdownItem
                  icon={<Plus className="size-4" />}
                  onClick={() => {
                    close()
                    setAddExerciseOpen(true)
                  }}
                >
                  Добавить упражнение
                </DropdownItem>
              ) : null}
              {current.status !== 'cancelled' ? (
                <DropdownItem
                  icon={<Pencil className="size-4" />}
                  onClick={() => {
                    close()
                    setEditOpen(true)
                  }}
                >
                  Редактировать
                </DropdownItem>
              ) : null}
              <DropdownItem
                icon={<Trash2 className="size-4" />}
                danger
                onClick={() => {
                  close()
                  setRemoveConfirmOpen(true)
                }}
              >
                Удалить тренировку
              </DropdownItem>
            </>
          )}
        </DropdownMenu>
        {current.status === 'planned' ? (
          <Button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="h-11 shrink-0"
          >
            <Play className="size-4" />
            Начать
          </Button>
        ) : null}
        {canEditStructure && current.status === 'in_progress' ? (
          <Button
            type="button"
            onClick={() => setFinishConfirmOpen(true)}
            className="h-11 shrink-0"
          >
            <CheckCircle2 className="size-4" />
            Завершить
          </Button>
        ) : null}
      </header>

      {current.notes ? (
        <p className="mb-5 line-clamp-2 text-sm text-[var(--muted)]">{current.notes}</p>
      ) : null}

      {sortedExercises.length === 0 || !activeExercise ? (
        <EmptyState>Добавь упражнения, чтобы записывать подходы.</EmptyState>
      ) : (
        <div>
          <ExerciseStepper
            name={exerciseName(activeExercise.exerciseId)}
            index={activeIndex}
            total={sortedExercises.length}
            onPrev={() => {
              const prev = sortedExercises[activeIndex - 1]
              if (prev) setActiveExerciseId(prev.id)
            }}
            onNext={() => {
              const next = sortedExercises[activeIndex + 1]
              if (next) setActiveExerciseId(next.id)
            }}
            onSelect={(itemIndex) => {
              const selected = sortedExercises[itemIndex]
              if (selected) setActiveExerciseId(selected.id)
            }}
          />
          {activeCatalogExercise ? (
            <SessionExerciseMedia exercise={activeCatalogExercise} />
          ) : null}
          <section>
            <EditTrainingExerciseRow
              trainingId={id}
              item={activeExercise}
              exerciseName={exerciseName(activeExercise.exerciseId)}
              canEdit={canEditStructure}
              canRemove={canRemoveExercise}
              canMoveUp={activeIndex > 0}
              canMoveDown={activeIndex < sortedExercises.length - 1}
              neighborAboveId={sortedExercises[activeIndex - 1]?.id}
              neighborAboveOrder={sortedExercises[activeIndex - 1]?.exerciseOrder}
              neighborBelowId={sortedExercises[activeIndex + 1]?.id}
              neighborBelowOrder={sortedExercises[activeIndex + 1]?.exerciseOrder}
            />

            <PreviousMaxHint
              previousMaxWeight={activeExercise.previousMaxWeight}
              currentMaxWeight={workingSetMaxWeight(
                activeExercise.sets,
                activeExercise.isWarmup,
              )}
            />

            <div className="mt-5 mb-2 flex items-baseline justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                Подходы
              </p>
              <p className="text-sm tabular-nums text-[var(--muted)]">
                {
                  activeExercise.sets.filter((set) => !set.isWarmup && set.completed)
                    .length
                }{' '}
                / {activeExercise.targetSets}
              </p>
            </div>

            {activeExercise.sets.length > 0 ? (
              <ul className="space-y-2">
                {activeExercise.sets.map((set) => (
                  <EditSetRow
                    key={set.id}
                    trainingId={id}
                    set={set}
                    canEdit={canEditSets}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">Пока нет подходов.</p>
            )}

            {canEditStructure ? (
              <LogSetForm
                key={activeExercise.id}
                trainingId={id}
                exerciseId={activeExercise.id}
                nextSetNumber={activeExercise.sets.length + 1}
                defaultWeight={
                  lastWorkingSetWeight(activeExercise.sets) ??
                  activeExercise.previousMaxWeight ??
                  targetWeightFrom(activeExercise.metadata)
                }
                onLogged={handleSetLogged}
              />
            ) : null}
          </section>
        </div>
      )}

      <AddTrainingExerciseModal
        open={addExerciseOpen}
        onClose={() => setAddExerciseOpen(false)}
        trainingId={id}
        nextOrder={current.exercises.length}
        onAdded={(exerciseRowId) => setActiveExerciseId(exerciseRowId)}
      />

      <EditTrainingForm
        training={current}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmModal
        open={finishConfirmOpen}
        onClose={() => setFinishConfirmOpen(false)}
        onConfirm={handleFinish}
        title="Завершить тренировку?"
        description="После завершения тренировка сохранится в истории."
        confirmLabel="Завершить"
        pending={finishing}
      />

      <ConfirmModal
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        onConfirm={handleRemove}
        title="Удалить тренировку?"
        description="Тренировка и все записанные подходы будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        confirmVariant="danger"
        pending={removing}
      />

      {current.status === 'in_progress' ? <RestTimerBar /> : null}
    </div>
  )
}

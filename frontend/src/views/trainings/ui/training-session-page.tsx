'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Play, Timer, Trash2 } from 'lucide-react'

import { AddTrainingExerciseForm } from '@/features/add-training-exercise/ui/add-training-exercise-form'
import { EditSetRow } from '@/features/edit-set/ui/edit-set-row'
import { EditTrainingExerciseRow } from '@/features/edit-training-exercise/ui/edit-training-exercise-row'
import { EditTrainingForm } from '@/features/edit-training/ui/edit-training-form'
import { RemoveTrainingExerciseButton } from '@/features/remove-training-exercise/ui/remove-training-exercise-button'
import { LogSetForm } from '@/features/log-set/ui/log-set-form'
import { RestTimerBar, SessionClock } from '@/features/rest-timer/ui/rest-timer-bar'
import {
  pauseBackgroundSync,
  resumeBackgroundSync,
} from '@/features/sync-trainings/model/background-sync'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import {
  formatKg,
  lastWorkingSetWeight,
  workingSetMaxWeight,
} from '@/entities/training/lib/session-weight'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

const DEFAULT_REST_SECONDS = 90

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
    <p className="mt-1 text-xs text-[var(--muted)]">
      {previousMaxWeight != null ? (
        <>Прошлый макс: {formatKg(previousMaxWeight)} кг</>
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
  index,
  total,
  onPrev,
  onNext,
}: {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={index <= 0}
        onClick={onPrev}
        className="px-3"
      >
        <ChevronLeft className="size-4" />
        Назад
      </Button>
      <p className="text-sm tabular-nums text-[var(--muted)]">
        {index + 1} / {total}
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={index >= total - 1}
        onClick={onNext}
        className="px-3"
      >
        Вперёд
        <ChevronRight className="size-4" />
      </Button>
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

  const [timerOpen, setTimerOpen] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerTotal, setTimerTotal] = useState(DEFAULT_REST_SECONDS)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_REST_SECONDS)
  const [restAccumulated, setRestAccumulated] = useState(0)
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)

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
    if (!timerOpen || !timerRunning || secondsLeft <= 0) return
    const interval = window.setInterval(() => {
      setRestAccumulated((value) => value + 1)
      setSecondsLeft((value) => {
        if (value <= 1) {
          setTimerRunning(false)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerOpen, timerRunning, secondsLeft])

  useEffect(() => {
    if (!timerOpen || secondsLeft !== 0) return
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      try {
        new Notification('Отдых закончен', { body: 'Можно делать следующий подход' })
      } catch {
        // ignore notification errors
      }
    }
  }, [timerOpen, secondsLeft])

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

  function startRest(seconds = DEFAULT_REST_SECONDS) {
    const next = Math.max(15, seconds)
    setTimerTotal(next)
    setSecondsLeft(next)
    setTimerOpen(true)
    setTimerRunning(true)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }

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
      router.push('/plan')
    } finally {
      setRemoving(false)
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
    <div className={timerOpen ? 'pb-36' : undefined}>
      <Link
        href="/plan"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Неделя
      </Link>

      <PageHeader
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{whenLabel}</span>
            {current.status === 'in_progress' && current.startedAt ? (
              <SessionClock startedAt={current.startedAt} restSeconds={restAccumulated} />
            ) : null}
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TrainingStatusBadge status={current.status} />
            {current.status !== 'cancelled' ? (
              <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
              </Button>
            ) : null}
            {current.status === 'in_progress' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => startRest(timerTotal || DEFAULT_REST_SECONDS)}
              >
                <Timer className="size-4" />
              </Button>
            ) : null}
            {current.status === 'planned' ? (
              <Button
                type="button"
                onClick={() =>
                  void start(id).then(() => {
                    router.refresh()
                  })
                }
              >
                <Play className="size-4" />
              </Button>
            ) : null}
            {canEditStructure && current.status === 'in_progress' ? (
              <Button
                type="button"
                onClick={() => setFinishConfirmOpen(true)}
              >
                <CheckCircle2 className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              onClick={() => setRemoveConfirmOpen(true)}
              aria-label="Удалить тренировку"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      {current.notes ? (
        <p className="mb-6 whitespace-pre-wrap text-sm text-[var(--muted)]">{current.notes}</p>
      ) : null}

      {sortedExercises.length === 0 || !activeExercise ? (
        <EmptyState>Добавь упражнения, чтобы записывать подходы.</EmptyState>
      ) : (
        <div>
          <ExerciseStepper
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
          />
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            {canEditStructure ? (
              <EditTrainingExerciseRow
                trainingId={id}
                item={activeExercise}
                exerciseName={exerciseName(activeExercise.exerciseId)}
                displayIndex={activeIndex + 1}
                canMoveUp={activeIndex > 0}
                canMoveDown={activeIndex < sortedExercises.length - 1}
                neighborAboveId={sortedExercises[activeIndex - 1]?.id}
                neighborAboveOrder={sortedExercises[activeIndex - 1]?.exerciseOrder}
                neighborBelowId={sortedExercises[activeIndex + 1]?.id}
                neighborBelowOrder={sortedExercises[activeIndex + 1]?.exerciseOrder}
              />
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg">
                    {exerciseName(activeExercise.exerciseId)}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Цель: {activeExercise.targetSets} подходов
                    {activeExercise.minReps != null || activeExercise.maxReps != null
                      ? ` · ${activeExercise.minReps ?? '?'}–${activeExercise.maxReps ?? '?'} повт.`
                      : ''}
                    {targetWeightFrom(activeExercise.metadata) != null
                      ? ` · ${targetWeightFrom(activeExercise.metadata)} кг`
                      : ''}
                    {activeExercise.restSeconds != null
                      ? ` · отдых ${activeExercise.restSeconds}с`
                      : ''}
                  </p>
                </div>
                {canRemoveExercise ? (
                  <RemoveTrainingExerciseButton
                    trainingId={id}
                    exerciseRowId={activeExercise.id}
                    exerciseName={exerciseName(activeExercise.exerciseId)}
                  />
                ) : null}
              </div>
            )}

            <PreviousMaxHint
              previousMaxWeight={activeExercise.previousMaxWeight}
              currentMaxWeight={workingSetMaxWeight(
                activeExercise.sets,
                activeExercise.isWarmup,
              )}
            />

            {activeExercise.sets.length > 0 ? (
              <ul className="mt-4 space-y-2">
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
              <p className="mt-3 text-sm text-[var(--muted)]">Пока нет подходов.</p>
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
                onLogged={() =>
                  startRest(activeExercise.restSeconds ?? DEFAULT_REST_SECONDS)
                }
              />
            ) : null}
          </section>
        </div>
      )}

      {canEditStructure ? (
        <AddTrainingExerciseForm
          trainingId={id}
          nextOrder={current.exercises.length}
        />
      ) : null}

      {timerOpen ? (
        <RestTimerBar
          secondsLeft={secondsLeft}
          running={timerRunning}
          totalSeconds={timerTotal}
          onToggle={() => {
            if (secondsLeft <= 0) {
              startRest(timerTotal || DEFAULT_REST_SECONDS)
              return
            }
            setTimerRunning((value) => !value)
          }}
          onSkip={() => {
            setTimerOpen(false)
            setTimerRunning(false)
          }}
          onReset={() => {
            setSecondsLeft(timerTotal)
            setTimerRunning(true)
          }}
          onAdjust={(delta) => {
            setSecondsLeft((value) => {
              const next = Math.max(0, value + delta)
              setTimerTotal((total) => Math.max(total, next))
              return next
            })
            if (delta > 0) setTimerRunning(true)
          }}
          onPreset={(seconds) => startRest(seconds)}
        />
      ) : null}

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
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Play, Timer, Trash2 } from 'lucide-react'

import { AddTrainingExerciseForm } from '@/features/add-training-exercise/ui/add-training-exercise-form'
import { EditSetRow } from '@/features/edit-set/ui/edit-set-row'
import { EditTrainingExerciseRow } from '@/features/edit-training-exercise/ui/edit-training-exercise-row'
import { RemoveTrainingExerciseButton } from '@/features/remove-training-exercise/ui/remove-training-exercise-button'
import { LogSetForm } from '@/features/log-set/ui/log-set-form'
import { RestTimerBar, SessionClock } from '@/features/rest-timer/ui/rest-timer-bar'
import {
  pauseBackgroundSync,
  resumeBackgroundSync,
} from '@/features/sync-trainings/model/background-sync'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

const DEFAULT_REST_SECONDS = 90

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

  const [timerOpen, setTimerOpen] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerTotal, setTimerTotal] = useState(DEFAULT_REST_SECONDS)
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_REST_SECONDS)
  const [restAccumulated, setRestAccumulated] = useState(0)
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    void fetchOne(id)
    void fetchExercises()
  }, [id, fetchOne, fetchExercises])

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
        title="Тренировка"
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
            {current.status === 'in_progress' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => startRest(timerTotal || DEFAULT_REST_SECONDS)}
              >
                <Timer className="size-4" />
                Отдых
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
                Старт
              </Button>
            ) : null}
            {canEditStructure && current.status === 'in_progress' ? (
              <Button
                type="button"
                onClick={() => setFinishConfirmOpen(true)}
              >
                <CheckCircle2 className="size-4" />
                Завершить
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                void remove(id).then(() => {
                  window.location.href = '/plan'
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        }
      />

      {sortedExercises.length === 0 ? (
        <EmptyState>Добавь упражнения, чтобы записывать подходы.</EmptyState>
      ) : (
        <div className="space-y-4">
          {sortedExercises.map((exercise, index) => (
            <section
              key={exercise.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              {canEditStructure ? (
                <EditTrainingExerciseRow
                  trainingId={id}
                  item={exercise}
                  exerciseName={exerciseName(exercise.exerciseId)}
                  displayIndex={index + 1}
                  canMoveUp={index > 0}
                  canMoveDown={index < sortedExercises.length - 1}
                  neighborAboveId={sortedExercises[index - 1]?.id}
                  neighborAboveOrder={sortedExercises[index - 1]?.exerciseOrder}
                  neighborBelowId={sortedExercises[index + 1]?.id}
                  neighborBelowOrder={sortedExercises[index + 1]?.exerciseOrder}
                />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-lg">
                      {exerciseName(exercise.exerciseId)}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      Цель: {exercise.targetSets} подходов
                      {exercise.minReps != null || exercise.maxReps != null
                        ? ` · ${exercise.minReps ?? '?'}–${exercise.maxReps ?? '?'} повт.`
                        : ''}
                      {typeof exercise.metadata?.targetWeight === 'number'
                        ? ` · ${exercise.metadata.targetWeight} кг`
                        : ''}
                      {exercise.restSeconds != null ? ` · отдых ${exercise.restSeconds}с` : ''}
                    </p>
                  </div>
                  {canRemoveExercise ? (
                    <RemoveTrainingExerciseButton
                      trainingId={id}
                      exerciseRowId={exercise.id}
                      exerciseName={exerciseName(exercise.exerciseId)}
                    />
                  ) : null}
                </div>
              )}

              {exercise.sets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {exercise.sets.map((set) => (
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
                  trainingId={id}
                  exerciseId={exercise.id}
                  nextSetNumber={exercise.sets.length + 1}
                  defaultWeight={
                    typeof exercise.metadata?.targetWeight === 'number'
                      ? exercise.metadata.targetWeight
                      : null
                  }
                  onLogged={() =>
                    startRest(exercise.restSeconds ?? DEFAULT_REST_SECONDS)
                  }
                />
              ) : null}
            </section>
          ))}
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

      <ConfirmModal
        open={finishConfirmOpen}
        onClose={() => setFinishConfirmOpen(false)}
        onConfirm={handleFinish}
        title="Завершить тренировку?"
        description="После завершения тренировка сохранится в истории."
        confirmLabel="Завершить"
        pending={finishing}
      />
    </div>
  )
}

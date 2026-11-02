'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'

import { AddTrainingExerciseModal } from '@/features/add-training-exercise/ui/add-training-exercise-modal'
import { TrainingExerciseNotes } from '@/features/training-exercise-notes/ui/training-exercise-notes'
import { EditSetRow } from '@/features/edit-set/ui/edit-set-row'
import { SetComments } from '@/features/set-comments/ui/set-comments'
import { coachApi } from '@/entities/coach/api/coach-api'
import type { SetComment } from '@/entities/coach/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { EditTrainingExerciseRow } from '@/features/edit-training-exercise/ui/edit-training-exercise-row'
import { EditTrainingForm } from '@/features/edit-training/ui/edit-training-form'
import { LogSetForm } from '@/features/log-set/ui/log-set-form'
import { GroupRestField } from '@/features/manage-exercise-group/ui/group-rest-field'
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
import { SessionExerciseVideo } from '@/entities/source/ui/session-exercise-video'
import { useConstrainedConnection } from '@/shared/lib/use-constrained-connection'
import {
  countCompletedGroupRounds,
  getNextExerciseInGroup,
} from '@/entities/session/lib/build-session-items'
import {
  groupTypeLabel,
  resolveLinkWithBelowAction,
} from '@/entities/session/lib/exercise-group-utils'
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

function exerciseProgress(
  item: {
    id: string
    groupId: string | null
    targetSets: number
    sets: Array<{ completed: boolean; isWarmup?: boolean }>
  },
  all: Array<{
    id: string
    groupId: string | null
    positionInGroup: number | null
    targetSets: number
    sets: Array<{ completed: boolean; isWarmup?: boolean }>
  }>,
) {
  if (item.groupId) {
    const members = all.filter((row) => row.groupId === item.groupId)
    const target = Math.max(...members.map((row) => row.targetSets), 1)
    const rounds = countCompletedGroupRounds(item.groupId, all)
    return Math.min(1, rounds / target)
  }
  const done = item.sets.filter((set) => !set.isWarmup && set.completed).length
  return Math.min(1, done / Math.max(item.targetSets, 1))
}

function ExerciseStepper({
  name,
  index,
  progress,
  groupPartners,
  groupType,
  activeExerciseId,
  onSelect,
  onSelectExercise,
}: {
  name: string
  index: number
  progress: number[]
  groupPartners?: Array<{ id: string; name: string }>
  groupType?: string
  activeExerciseId?: string
  onSelect: (index: number) => void
  onSelectExercise?: (exerciseId: string) => void
}) {
  const total = progress.length

  return (
    <div className="mb-5">
      <div className="min-w-0 text-center">
        {groupPartners && groupPartners.length > 1 && groupType ? (
          <p className="mb-1 text-xs font-medium text-[var(--accent)]">{groupType}</p>
        ) : null}
        <h1 className="text-wrap break-words font-[family-name:var(--font-display)] text-2xl tracking-tight">
          {name}
        </h1>
      </div>
      {groupPartners && groupPartners.length > 1 ? (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {groupPartners.map((partner) => (
            <button
              key={partner.id}
              type="button"
              onClick={() => onSelectExercise?.(partner.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition',
                partner.id === activeExerciseId
                  ? 'bg-[var(--accent)] text-[var(--background)]'
                  : 'border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {partner.name}
            </button>
          ))}
        </div>
      ) : null}
      {total > 0 ? (
        <div className="mt-4 flex items-center px-1">
          {progress.map((ratio, itemIndex) => {
            const isActive = itemIndex === index
            const isDone = ratio >= 1
            const glow = Math.round((isActive ? Math.max(ratio, 0.65) : ratio) * 100)
            const prevRatio = itemIndex > 0 ? progress[itemIndex - 1] : 0
            const leftStrength = prevRatio
            const rightStrength = ratio
            const lineStrength = Math.max(leftStrength, rightStrength)
            const lineLit = lineStrength > 0

            return (
              <div key={itemIndex} className="contents">
                {itemIndex > 0 ? (
                  <div
                    className="min-w-2 flex-1 rounded-full transition-all"
                    style={{
                      height: lineLit ? 2 : 1,
                      background:
                        leftStrength >= 1 && rightStrength >= 1
                          ? 'var(--accent)'
                          : lineLit
                            ? `linear-gradient(90deg, color-mix(in oklab, var(--accent) ${Math.round(leftStrength * 100)}%, var(--border)), color-mix(in oklab, var(--accent) ${Math.round(rightStrength * 100)}%, var(--border)))`
                            : 'var(--border)',
                      boxShadow: lineLit
                        ? `0 0 ${6 + Math.round(lineStrength * 10)}px color-mix(in oklab, var(--accent) ${Math.round(25 + lineStrength * 50)}%, transparent)`
                        : undefined,
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  aria-label={
                    isDone
                      ? `Упражнение ${itemIndex + 1}, выполнено`
                      : `Упражнение ${itemIndex + 1}`
                  }
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(itemIndex)}
                  className={cn(
                    'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition',
                    isDone
                      ? 'bg-[var(--accent)] text-[var(--background)] shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_45%,transparent)]'
                      : isActive
                        ? 'border-2 border-[var(--accent)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] text-[var(--accent)] shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_40%,transparent)]'
                        : glow > 0
                          ? 'border border-[var(--accent)] text-[var(--accent)]'
                          : 'border border-[var(--border)] bg-[color-mix(in_oklab,var(--surface)_70%,transparent)] text-[var(--muted)]',
                  )}
                  style={
                    !isActive && !isDone && glow > 0
                      ? {
                          boxShadow: `0 0 ${8 + Math.round(glow / 10)}px color-mix(in oklab, var(--accent) ${Math.round(20 + glow * 0.45)}%, transparent)`,
                          background: `color-mix(in oklab, var(--accent) ${Math.round(glow * 0.38)}%, transparent)`,
                        }
                      : undefined
                  }
                >
                  {isDone ? <Check className="size-4" strokeWidth={3} /> : itemIndex + 1}
                </button>
              </div>
            )
          })}
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
  const updateGroup = useTrainingStore((s) => s.updateGroup)
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
  const [setComments, setSetComments] = useState<SetComment[]>([])
  const mode = useSessionStore((s) => s.mode)

  const autoStartRestTimer = usePreferencesStore((s) => s.autoStartRestTimer)
  const restTimerSkipWarmup = usePreferencesStore((s) => s.restTimerSkipWarmup)
  const defaultRestSeconds = usePreferencesStore((s) => s.defaultRestSeconds)
  const showSessionExerciseImage = usePreferencesStore((s) => s.showSessionExerciseImage)
  const showSessionMuscleDiagram = usePreferencesStore((s) => s.showSessionMuscleDiagram)
  const showSessionVideo = usePreferencesStore((s) => s.showSessionVideo)
  const showSessionNotes = usePreferencesStore((s) => s.showSessionNotes)
  const constrainedConnection = useConstrainedConnection()
  const showExerciseImage = showSessionExerciseImage && !constrainedConnection
  const startRestTimer = useRestTimerStore((s) => s.start)
  const dismissRestTimer = useRestTimerStore((s) => s.dismiss)

  function handleSetLogged({ isWarmup, isDrop }: { isWarmup: boolean; isDrop?: boolean }) {
    if (!current || !activeExerciseId) return

    const exercise = current.exercises.find((item) => item.id === activeExerciseId)
    if (!exercise) return

    const nextInGroup = getNextExerciseInGroup(exercise, current.exercises)
    if (nextInGroup) {
      setActiveExerciseId(nextInGroup.id)
      return
    }

    if (isDrop) return

    if (!autoStartRestTimer || (isWarmup && restTimerSkipWarmup)) return

    const group = exercise.groupId
      ? (current.groups ?? []).find((item) => item.id === exercise.groupId)
      : undefined
    startRestTimer(resolveRestSeconds(exercise, defaultRestSeconds, group?.restSeconds))
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
    if (mode !== 'cloud') {
      setSetComments([])
      return
    }
    let cancelled = false
    void coachApi
      .listComments(id)
      .then((result) => {
        if (!cancelled) setSetComments(result.items)
      })
      .catch(() => {
        if (!cancelled) setSetComments([])
      })
    return () => {
      cancelled = true
    }
  }, [id, mode])

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
        if (item.groupId) {
          const members = sorted.filter((row) => row.groupId === item.groupId)
          const leader = [...members].sort(
            (a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0),
          )[0]
          if (leader?.id !== item.id) return false
          const rounds = countCompletedGroupRounds(item.groupId, sorted)
          const target = Math.max(...members.map((row) => row.targetSets))
          return rounds < target
        }
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
  const belowExercise = sortedExercises[activeIndex + 1]
  const linkAction =
    activeExercise && belowExercise
      ? resolveLinkWithBelowAction(activeExercise, belowExercise, sortedExercises)
      : null
  const canLinkWithBelow = canEditStructure && linkAction != null
  const activeGroup = activeExercise?.groupId
    ? (current.groups ?? []).find((item) => item.id === activeExercise.groupId)
    : null
  const groupPartners = activeExercise?.groupId
    ? sortedExercises
        .filter((item) => item.groupId === activeExercise.groupId)
        .sort((a, b) => (a.positionInGroup ?? 0) - (b.positionInGroup ?? 0))
        .map((item) => ({
          id: item.id,
          name: exerciseName(item.exerciseId),
        }))
    : undefined
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
                icon={<Settings className="size-4" />}
                onClick={() => {
                  close()
                  router.push('/settings')
                }}
              >
                Настройки
              </DropdownItem>
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
            progress={sortedExercises.map((item) =>
              exerciseProgress(item, sortedExercises),
            )}
            groupPartners={groupPartners}
            groupType={activeGroup ? groupTypeLabel(activeGroup.type) : undefined}
            activeExerciseId={activeExercise.id}
            onSelect={(itemIndex) => {
              const selected = sortedExercises[itemIndex]
              if (selected) setActiveExerciseId(selected.id)
            }}
            onSelectExercise={(exerciseId) => setActiveExerciseId(exerciseId)}
          />
          {activeCatalogExercise &&
          (showExerciseImage || showSessionMuscleDiagram) ? (
            <SessionExerciseMedia
              exercise={activeCatalogExercise}
              showImage={showExerciseImage}
              showMuscleDiagram={showSessionMuscleDiagram}
            />
          ) : null}
          {activeExercise && showSessionVideo ? (
            <SessionExerciseVideo exerciseId={activeExercise.exerciseId} />
          ) : null}
          {showSessionNotes ? (
            <TrainingExerciseNotes
              trainingId={id}
              exerciseRowId={activeExercise.id}
              notes={activeExercise.notes}
              canEdit={canEditStructure}
            />
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
              canLinkWithBelow={canLinkWithBelow}
              linkAction={linkAction ?? undefined}
              groupId={activeExercise.groupId}
              groupType={activeGroup?.type}
              groupRestSeconds={activeGroup?.restSeconds}
            />

            {activeGroup && canEditStructure ? (
              <GroupRestField
                type={activeGroup.type}
                restSeconds={activeGroup.restSeconds}
                onSave={(restSeconds) => updateGroup(id, activeGroup.id, { restSeconds })}
              />
            ) : null}

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
                    footer={
                      <SetComments
                        setId={set.id}
                        comments={setComments}
                      />
                    }
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
                sets={activeExercise.sets}
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

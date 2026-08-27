'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useExerciseStore } from '@/entities/exercise/model/store'
import { useLastFinishedTraining } from '@/entities/stats/model/use-last-finished-training'
import { LastTrainingSummary } from '@/entities/stats/ui/last-training-summary'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'

export function DashboardPage() {
  const router = useRouter()
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const start = useTrainingStore((s) => s.start)
  const create = useTrainingStore((s) => s.create)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const exercises = useExerciseStore((s) => s.items)
  const fetchExercises = useExerciseStore((s) => s.fetchList)
  const { training: lastFinishedTraining, details: lastTrainingDetails } =
    useLastFinishedTraining()

  useEffect(() => {
    void fetchTrainings({ limit: 50 })
    void fetchTemplates()
    void fetchExercises('')
  }, [fetchTrainings, fetchTemplates, fetchExercises])

  const todayKey = toDateKey(new Date())

  const active = trainings.find((item) => item.status === 'in_progress')

  const todayItems = trainings.filter((t) => {
    if (t.status === 'cancelled') return false
    const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
    return toDateKey(new Date(when)) === todayKey
  })

  const todayPlanned = todayItems.find((t) => t.status === 'planned')
  const todayFinished = todayItems.find((t) => t.status === 'finished')

  function labelFor(templateId: string | null, fallback = 'Тренировка') {
    if (!templateId) return fallback
    return templates.find((t) => t.id === templateId)?.name ?? fallback
  }

  function resolveExerciseName(exerciseId: string) {
    return exercises.find((item) => item.id === exerciseId)?.name ?? 'Упражнение'
  }

  async function continueOrStart() {
    if (active) {
      router.push(`/trainings/${active.id}`)
      return
    }
    if (todayPlanned) {
      const training = await start(todayPlanned.id)
      router.push(`/trainings/${training.id}`)
      return
    }

    const templateId =
      todayFinished?.templateId ?? templates[0]?.id ?? null

    if (templateId || templates.length === 0) {
      if (!templateId) {
        router.push('/plans')
        return
      }
      const training = await create({
        templateId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
      router.push(`/trainings/${training.id}`)
      return
    }

    router.push('/plans')
  }

  const ctaLabel = active
    ? 'Продолжить'
    : todayPlanned
      ? 'Начать сегодня'
      : todayFinished
        ? 'Ещё одна тренировка'
        : templates.length > 0
          ? 'Начать тренировку'
          : 'Создать план'

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Сегодня"
        description={
          active
            ? 'Есть незавершённая сессия.'
            : todayPlanned
              ? `По плану: ${labelFor(todayPlanned.templateId)}`
              : todayFinished
                ? `Уже сделано: ${labelFor(todayFinished.templateId)}. Можно начать ещё одну.`
                : 'Начни тренировку или открой неделю.'
        }
      />

      {active || todayPlanned ? (
        <button
          type="button"
          onClick={() => void continueOrStart()}
          className="mb-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 text-left transition hover:bg-[var(--accent)]/15"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--accent)]">
              {active ? 'В процессе' : 'Запланировано'}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
              {labelFor(active?.templateId ?? todayPlanned?.templateId ?? null)}
            </p>
            <div className="mt-2">
              <TrainingStatusBadge status={active?.status ?? todayPlanned!.status} />
            </div>
          </div>
          <ArrowRight className="size-5 text-[var(--accent)]" />
        </button>
      ) : null}

      <div className="flex flex-col gap-3">
        <Button type="button" className="w-full" onClick={() => void continueOrStart()}>
          <Play className="size-4" />
          {ctaLabel}
        </Button>
        <Link
          href="/week"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-sm text-[var(--foreground)] transition hover:border-[var(--accent)]/30"
        >
          <CalendarDays className="size-4" />
          Открыть неделю
        </Link>
      </div>

      {lastFinishedTraining ? (
        <div className="mt-8">
          <LastTrainingSummary
            className="mb-0"
            training={lastFinishedTraining}
            details={lastTrainingDetails}
            title={labelFor(lastFinishedTraining.templateId)}
            resolveExerciseName={resolveExerciseName}
          />
        </div>
      ) : null}
    </div>
  )
}

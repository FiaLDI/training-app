'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { StartTrainingButton } from '@/features/start-training/ui/start-training-button'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingActivityCalendar } from '@/entities/training/ui/training-activity-calendar'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import { useTemplateStore } from '@/entities/template/model/store'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

export function DashboardPage() {
  const trainings = useTrainingStore((s) => s.items)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const loading = useTrainingStore((s) => s.loading)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  useEffect(() => {
    void fetchTrainings({ limit: 100 })
    void fetchTemplates()
  }, [fetchTrainings, fetchTemplates])

  const active = trainings.find((item) => item.status === 'in_progress')
  const weekStart = startOfWeekMonday(new Date())
  const weekKey = toDateKey(weekStart)
  const weekEndKey = toDateKey(
    new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6),
  )

  const thisWeek = trainings
    .filter((t) => {
      if (t.status === 'cancelled') return false
      const when = t.scheduledAt ?? t.startedAt
      if (!when) return false
      const key = toDateKey(new Date(when))
      return key >= weekKey && key <= weekEndKey
    })
    .sort((a, b) => {
      const aKey = a.scheduledAt ?? a.startedAt ?? ''
      const bKey = b.scheduledAt ?? b.startedAt ?? ''
      return aKey.localeCompare(bKey)
    })

  function labelFor(training: (typeof trainings)[number]) {
    if (training.templateId) {
      const name = templates.find((t) => t.id === training.templateId)?.name
      if (name) return name
    }
    return training.notes || 'Тренировка'
  }

  const recent = trainings.slice(0, 5)

  return (
    <div>
      <PageHeader
        title="Тренируйся сегодня"
        description="Начни сейчас или открой неделю."
        action={<StartTrainingButton />}
      />

      {active ? (
        <Link
          href={`/trainings/${active.id}`}
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 transition hover:bg-[var(--accent)]/15"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Активная сессия</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl">
              Продолжить тренировку
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Начата {active.startedAt ? new Date(active.startedAt).toLocaleString('ru-RU') : '—'}
            </p>
          </div>
          <ArrowRight className="size-5 text-[var(--accent)]" />
        </Link>
      ) : null}

      <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Эта неделя</h2>
          <Link href="/plan" className="text-sm text-[var(--accent)] hover:underline">
            Открыть неделю
          </Link>
        </div>
        {thisWeek.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Пока пусто.{' '}
            <Link href="/plan" className="text-[var(--accent)] hover:underline">
              Заполни неделю
            </Link>{' '}
            из расписания или добавь тренировку на день.
          </p>
        ) : (
          <ul className="space-y-2">
            {thisWeek.slice(0, 5).map((training) => (
              <li key={training.id}>
                <Link
                  href={`/trainings/${training.id}`}
                  className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  <span>
                    {training.scheduledAt
                      ? new Date(training.scheduledAt).toLocaleDateString('ru-RU')
                      : training.startedAt
                        ? new Date(training.startedAt).toLocaleDateString('ru-RU')
                        : '—'}
                    <span className="ml-2 text-[var(--muted)]">{labelFor(training)}</span>
                  </span>
                  <TrainingStatusBadge status={training.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm">
          <Link href="/stats" className="text-[var(--muted)] hover:text-[var(--foreground)]">
            Статистика →
          </Link>
        </p>
      </section>

      <TrainingActivityCalendar trainings={trainings} />

      <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">Недавние</h2>
      {loading && recent.length === 0 ? (
        <ListSkeleton count={3} />
      ) : recent.length === 0 ? (
        <EmptyState>Пока нет тренировок. Начни первую.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {recent.map((training) => (
            <li key={training.id}>
              <Link
                href={`/trainings/${training.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/30"
              >
                <div>
                  <p className="text-sm text-[var(--foreground)]">{labelFor(training)}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {training.startedAt
                      ? new Date(training.startedAt).toLocaleString('ru-RU')
                      : training.scheduledAt
                        ? `Запланировано ${new Date(training.scheduledAt).toLocaleString('ru-RU')}`
                        : '—'}
                  </p>
                </div>
                <TrainingStatusBadge status={training.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

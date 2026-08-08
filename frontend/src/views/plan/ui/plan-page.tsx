'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Play, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { CreateProgramForm } from '@/features/create-program/ui/create-program-form'
import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { useTrainingStore } from '@/entities/training/model/store'
import { TrainingStatusBadge } from '@/entities/training/ui/training-status-badge'
import { toDateKey } from '@/entities/training/lib/activity-calendar'
import type { Training } from '@/entities/training/model/types'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'
import { ListSkeleton } from '@/shared/ui/skeleton'

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const DAY_FULL = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function toWeekStartIso(date: Date): string {
  return toDateKey(date)
}

export function PlanPage() {
  const router = useRouter()
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()))
  const trainings = useTrainingStore((s) => s.items)
  const loading = useTrainingStore((s) => s.loading)
  const fetchTrainings = useTrainingStore((s) => s.fetchList)
  const create = useTrainingStore((s) => s.create)
  const start = useTrainingStore((s) => s.start)
  const programs = useProgramStore((s) => s.items)
  const currentProgram = useProgramStore((s) => s.current)
  const fetchPrograms = useProgramStore((s) => s.fetchList)
  const fetchProgram = useProgramStore((s) => s.fetchOne)
  const addDay = useProgramStore((s) => s.addDay)
  const updateDay = useProgramStore((s) => s.updateDay)
  const removeDay = useProgramStore((s) => s.removeDay)
  const removeProgram = useProgramStore((s) => s.remove)
  const applyProgram = useProgramStore((s) => s.apply)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)

  const [programId, setProgramId] = useState('')
  const [savingDay, setSavingDay] = useState<number | null>(null)
  const [sheetDay, setSheetDay] = useState<string | null>(null)
  const [sheetTemplateId, setSheetTemplateId] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const from = useMemo(() => {
    const d = new Date(weekStart)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [weekStart])

  const to = useMemo(() => {
    const d = addDays(weekStart, 7)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [weekStart])

  useEffect(() => {
    void fetchTrainings({ from, to, limit: 100 })
    void fetchPrograms()
    void fetchTemplates()
  }, [from, to, fetchTrainings, fetchPrograms, fetchTemplates])

  useEffect(() => {
    if (programs.length > 0 && !programId) {
      setProgramId(programs[0].id)
    }
    if (programs.length === 0) {
      setProgramId('')
    }
  }, [programs, programId])

  useEffect(() => {
    if (programId) void fetchProgram(programId)
  }, [programId, fetchProgram])

  const days = useMemo(
    () => DAY_SHORT.map((label, index) => ({ label, date: addDays(weekStart, index) })),
    [weekStart],
  )

  function templateName(templateId: string | null) {
    if (!templateId) return 'Пустая сессия'
    return templates.find((t) => t.id === templateId)?.name ?? 'Тренировка'
  }

  function trainingLabel(training: Training) {
    return templateName(training.templateId) || training.notes || 'Тренировка'
  }

  function trainingsForDay(date: Date) {
    const key = toDateKey(date)
    return trainings.filter((t) => {
      if (t.status === 'cancelled') return false
      const when = t.scheduledAt ?? t.startedAt ?? t.createdAt
      return toDateKey(new Date(when)) === key
    })
  }

  async function onFillWeek() {
    if (!programId) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await applyProgram(programId, toWeekStartIso(weekStart))
      setMessage(`Добавлено ${result.created}, пропущено ${result.skipped}`)
      await fetchTrainings({ from, to, limit: 100 })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось заполнить неделю')
    } finally {
      setBusy(false)
    }
  }

  async function onDayChange(dayOfWeek: number, templateId: string) {
    if (!currentProgram || currentProgram.id !== programId) return
    setSavingDay(dayOfWeek)
    try {
      const primary = currentProgram.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)[0]
      const extras = currentProgram.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)
        .slice(1)

      for (const extra of extras) {
        await removeDay(programId, extra.id)
      }

      if (!templateId) {
        if (primary) await removeDay(programId, primary.id)
        return
      }

      if (primary) {
        await updateDay(programId, primary.id, { templateId, slotOrder: 0 })
      } else {
        await addDay(programId, { dayOfWeek, slotOrder: 0, templateId })
      }
    } finally {
      setSavingDay(null)
    }
  }

  async function planDay(templateId: string | null) {
    if (!sheetDay) return
    setBusy(true)
    setMessage(null)
    try {
      const scheduledAt = new Date(`${sheetDay}T12:00:00`).toISOString()
      await create({
        templateId,
        status: 'planned',
        scheduledAt,
      })
      setSheetDay(null)
      setSheetTemplateId('')
      await fetchTrainings({ from, to, limit: 100 })
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось запланировать')
    } finally {
      setBusy(false)
    }
  }

  async function startNow(templateId: string | null) {
    setBusy(true)
    setMessage(null)
    try {
      const training = await create({
        templateId,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
      })
      setSheetDay(null)
      router.push(`/trainings/${training.id}`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось начать')
      setBusy(false)
    }
  }

  async function onStart(id: string) {
    const training = await start(id)
    router.push(`/trainings/${training.id}`)
  }

  const sheetLabel = sheetDay
    ? days.find((d) => toDateKey(d.date) === sheetDay)?.label ?? sheetDay
    : ''

  const scheduleReady = currentProgram && currentProgram.id === programId

  return (
    <div>
      <PageHeader
        title="Неделя"
        description="Настрой расписание и заполни дни — или добавь тренировку вручную."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 text-center text-sm text-[var(--muted)]">
              {toDateKey(weekStart)} — {toDateKey(addDays(weekStart, 6))}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              onClick={() => void onFillWeek()}
              disabled={busy || !programId}
            >
              Заполнить неделю
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link href="/plans" className="text-[var(--accent)] hover:underline">
          Планы тренировок
        </Link>
      </div>

      {message ? <p className="mb-4 text-sm text-[var(--muted)]">{message}</p> : null}

      {loading && trainings.length === 0 ? <ListSkeleton count={3} /> : null}

      <div className="mb-10 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {days.map(({ label, date }) => {
          const key = toDateKey(date)
          const dayTrainings = trainingsForDay(date)
          const isToday = key === toDateKey(new Date())
          return (
            <div
              key={key}
              className={`rounded-xl border bg-[var(--surface)] p-3 ${
                isToday ? 'border-[var(--accent)]/50' : 'border-[var(--border)]'
              }`}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label}</p>
                <p className="text-xs text-[var(--muted)]">{date.getDate()}</p>
              </div>
              {dayTrainings.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">Свободно</p>
              ) : (
                <ul className="space-y-2">
                  {dayTrainings.map((training) => (
                    <li
                      key={training.id}
                      className="rounded-lg bg-[var(--surface-2)] px-2 py-2 text-xs"
                    >
                      <Link href={`/trainings/${training.id}`} className="block hover:underline">
                        {trainingLabel(training)}
                      </Link>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <TrainingStatusBadge status={training.status} />
                        {training.status === 'planned' ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-[var(--accent)]"
                            onClick={() => void onStart(training.id)}
                          >
                            <Play className="size-3" />
                            Старт
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
                onClick={() => {
                  setSheetDay(key)
                  setSheetTemplateId('')
                }}
              >
                <Plus className="size-3" />
                Добавить
              </button>
            </div>
          )
        })}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Расписание</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Какой план в какой день. Пусто = отдых. Потом нажми «Заполнить неделю».
            </p>
          </div>
          {programId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                void removeProgram(programId).then(() => {
                  setProgramId('')
                  void fetchPrograms()
                })
              }
            >
              <Trash2 className="size-4" />
              Удалить
            </Button>
          ) : null}
        </div>

        {programs.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--muted)]">Пока нет расписания. Создай одно:</p>
            <CreateProgramForm
              onCreated={(program) => {
                setProgramId(program.id)
                void fetchPrograms()
              }}
            />
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="min-w-48 flex-1 space-y-1 text-xs text-[var(--muted)]">
                Вариант
                <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </Select>
              </label>
              <CreateProgramForm
                onCreated={(program) => {
                  setProgramId(program.id)
                  void fetchPrograms()
                }}
              />
            </div>

            {scheduleReady ? (
              <ul className="space-y-3">
                {DAY_FULL.map((label, index) => {
                  const dayOfWeek = index + 1
                  const primary = currentProgram.days
                    .filter((d) => d.dayOfWeek === dayOfWeek)
                    .sort((a, b) => a.slotOrder - b.slotOrder)[0]
                  return (
                    <li
                      key={label}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 px-4 py-3"
                    >
                      <span className="w-36 text-sm text-[var(--foreground)]">{label}</span>
                      <Select
                        value={primary?.templateId ?? ''}
                        disabled={savingDay === dayOfWeek}
                        onChange={(e) => void onDayChange(dayOfWeek, e.target.value)}
                        className="min-w-48 flex-1"
                      >
                        <option value="">Отдых</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </Select>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ListSkeleton count={3} />
            )}
          </>
        )}
      </section>

      {sheetDay ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-xl">
                {sheetLabel} · {sheetDay}
              </h2>
              <button
                type="button"
                onClick={() => setSheetDay(null)}
                aria-label="Закрыть"
              >
                <X className="size-5 text-[var(--muted)]" />
              </button>
            </div>
            <label className="mb-4 block space-y-1 text-xs text-[var(--muted)]">
              План
              <Select
                value={sheetTemplateId}
                onChange={(e) => setSheetTemplateId(e.target.value)}
              >
                <option value="">Пустая сессия</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => void planDay(sheetTemplateId || null)}
                disabled={busy}
              >
                Запланировать
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void startNow(sheetTemplateId || null)}
                disabled={busy}
              >
                <Play className="size-4" />
                Начать сейчас
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSheetDay(null)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

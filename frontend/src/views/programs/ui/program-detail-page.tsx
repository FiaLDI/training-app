'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

import { useProgramStore } from '@/entities/program/model/store'
import { useTemplateStore } from '@/entities/template/model/store'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'
import { DetailSkeleton } from '@/shared/ui/skeleton'

const DAY_LABELS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

type Props = {
  id: string
}

export function ProgramDetailPage({ id }: Props) {
  const current = useProgramStore((s) => s.current)
  const loading = useProgramStore((s) => s.loading)
  const error = useProgramStore((s) => s.error)
  const fetchOne = useProgramStore((s) => s.fetchOne)
  const addDay = useProgramStore((s) => s.addDay)
  const updateDay = useProgramStore((s) => s.updateDay)
  const removeDay = useProgramStore((s) => s.removeDay)
  const remove = useProgramStore((s) => s.remove)
  const templates = useTemplateStore((s) => s.items)
  const fetchTemplates = useTemplateStore((s) => s.fetchList)
  const [savingDay, setSavingDay] = useState<number | null>(null)

  useEffect(() => {
    void fetchOne(id)
    void fetchTemplates()
  }, [id, fetchOne, fetchTemplates])

  async function onDayChange(dayOfWeek: number, templateId: string) {
    if (!current) return
    setSavingDay(dayOfWeek)
    try {
      const primary = current.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)[0]
      const extras = current.days
        .filter((d) => d.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.slotOrder - b.slotOrder)
        .slice(1)

      for (const extra of extras) {
        await removeDay(id, extra.id)
      }

      if (!templateId) {
        if (primary) await removeDay(id, primary.id)
        return
      }

      if (primary) {
        await updateDay(id, primary.id, { templateId, slotOrder: 0 })
      } else {
        await addDay(id, { dayOfWeek, slotOrder: 0, templateId })
      }
    } finally {
      setSavingDay(null)
    }
  }

  if (loading && !current) return <DetailSkeleton />
  if (error || !current) {
    return <p className="text-sm text-red-300">{error ?? 'Программа не найдена'}</p>
  }

  return (
    <div>
      <Link
        href="/programs"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Программы
      </Link>

      <PageHeader
        title={current.name}
        description="Один шаблон на день. Пусто = отдых (не попадает в неделю)."
        action={
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              void remove(id).then(() => {
                window.location.href = '/programs'
              })
            }
          >
            <Trash2 className="size-4" />
            Удалить
          </Button>
        }
      />

      <p className="mb-4 text-sm">
        <Link href="/plans" className="text-[var(--accent)] hover:underline">
          Управление шаблонами
        </Link>
      </p>

      <ul className="space-y-3">
        {DAY_LABELS.map((label, index) => {
          const dayOfWeek = index + 1
          const primary = current.days
            .filter((d) => d.dayOfWeek === dayOfWeek)
            .sort((a, b) => a.slotOrder - b.slotOrder)[0]
          return (
            <li
              key={label}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
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
    </div>
  )
}

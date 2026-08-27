'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

import { buildActivityMonths } from '@/entities/training/lib/activity-calendar'
import type { Training } from '@/entities/training/model/types'
import { cn } from '@/shared/lib/cn'

type Props = {
  trainings: Training[]
  className?: string
}

export function TrainingActivityCalendar({ trainings, className }: Props) {
  const { months, total } = buildActivityMonths(
    trainings
      .filter((t) => (t.status === 'finished' || t.status === 'in_progress') && t.startedAt)
      .map((t) => t.startedAt as string),
    new Date(),
    3,
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const currentMonthRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollRef.current
    const current = currentMonthRef.current
    if (!scroller || !current) return
    const scrollerRect = scroller.getBoundingClientRect()
    const currentRect = current.getBoundingClientRect()
    scroller.scrollLeft +=
      currentRect.left +
      currentRect.width / 2 -
      (scrollerRect.left + scroller.clientWidth / 2)
  }, [months.length])

  return (
    <section className={cn('mb-10', className)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Регулярность</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight">
            {total}
            <span className="ml-2 text-base font-normal text-[var(--muted)]">
              {total === 1 ? 'день с тренировкой' : 'дней с тренировкой'}
            </span>
          </p>
        </div>
        <p className="pb-1 text-xs text-[var(--muted)]">±2 месяца</p>
      </div>

      <div ref={scrollRef} className="-mx-1 px-1 pb-1">
        <div className="flex justify-center lg:justify-start lg:w-max gap-5 flex-wrap">
          {months.map((month, index) => (
            <div
              key={month.key}
              ref={month.isCurrent ? currentMonthRef : undefined}
              className={cn(
                'w-[132px] shrink-0',
                index === months.length - 1 && 'hidden md:block',
                month.isCurrent && 'rounded-xl bg-[var(--accent)]/8 p-2 -m-2 ring-1 ring-[var(--accent)]/20',
              )}
            >
              <p
                className={cn(
                  'mb-2 text-center text-[11px] font-medium tracking-wide',
                  month.isCurrent ? 'text-[var(--accent)]' : 'text-[var(--muted)]',
                )}
              >
                {month.label}
              </p>

              <div className="grid grid-cols-7 gap-1">
                {month.weeks.flatMap((week) =>
                  week.map((day) => {
                    if (day.outsideMonth) {
                      return <div key={`${month.key}-${day.date}`} className="aspect-square" />
                    }

                    const title = day.trained
                      ? `${day.date}: тренировка`
                      : `${day.date}: отдых`

                    const cellClass = cn(
                      'aspect-square rounded-md transition',
                      day.trained && 'bg-[var(--accent)]',
                      !day.trained &&
                        day.isFuture &&
                        'border border-[var(--border)] bg-transparent',
                      !day.trained && !day.isFuture && 'bg-[var(--border)]/70',
                      day.isToday && !day.trained && 'border-[var(--accent)]/60',
                      day.isToday && day.trained && 'ring-1 ring-[var(--foreground)]/40',
                    )

                    if (day.trained) {
                      return (
                        <Link
                          key={day.date}
                          href="/week"
                          title={title}
                          className={cn(cellClass, 'block hover:brightness-110')}
                        />
                      )
                    }

                    return (
                      <div key={day.date} title={title} className={cellClass} />
                    )
                  }),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-[11px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-md bg-[var(--border)]/70" />
          Прошлое
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-md border border-[var(--border)]" />
          Впереди
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3.5 rounded-md bg-[var(--accent)]" />
          Тренировка
        </span>
      </div>
    </section>
  )
}

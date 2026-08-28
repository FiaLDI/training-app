'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, Timer, X } from 'lucide-react'

import { formatRestTime } from '@/features/rest-timer/lib/format-time'
import { useRestTimerStore } from '@/features/rest-timer/model/store'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

const ADD_SECONDS = 30
const SUB_SECONDS = 15

export function RestTimerBar() {
  const status = useRestTimerStore((s) => s.status)
  const totalSeconds = useRestTimerStore((s) => s.totalSeconds)
  const getRemainingSeconds = useRestTimerStore((s) => s.getRemainingSeconds)
  const pause = useRestTimerStore((s) => s.pause)
  const resume = useRestTimerStore((s) => s.resume)
  const skip = useRestTimerStore((s) => s.skip)
  const dismiss = useRestTimerStore((s) => s.dismiss)
  const adjust = useRestTimerStore((s) => s.adjust)
  const finish = useRestTimerStore((s) => s.finish)

  const [remaining, setRemaining] = useState(() => getRemainingSeconds())

  useEffect(() => {
    if (status !== 'running') {
      setRemaining(getRemainingSeconds())
      return
    }

    const tick = () => {
      const next = getRemainingSeconds()
      setRemaining(next)
      if (next <= 0) finish()
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [status, getRemainingSeconds, finish])

  useEffect(() => {
    if (status === 'paused' || status === 'finished') {
      setRemaining(getRemainingSeconds())
    }
  }, [status, getRemainingSeconds])

  if (status === 'idle') return null

  const progress =
    totalSeconds > 0
      ? status === 'finished'
        ? 1
        : Math.min(1, Math.max(0, 1 - remaining / totalSeconds))
      : 0

  const isFinished = status === 'finished'
  const isPaused = status === 'paused'

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md',
        isFinished
          ? 'border-emerald-500/30 bg-emerald-950/90'
          : 'border-[var(--border)] bg-[var(--surface)]/95',
      )}
      role="region"
      aria-label="Таймер отдыха"
      aria-live="polite"
    >
      <div className="mx-auto max-w-lg">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300 ease-linear',
              isFinished ? 'bg-emerald-400' : 'bg-[var(--accent)]',
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl',
              isFinished
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-[var(--surface-2)] text-[var(--accent)]',
            )}
          >
            <Timer className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              {isFinished ? 'Отдых окончен' : isPaused ? 'Пауза' : 'Отдых'}
            </p>
            <p
              className={cn(
                'font-[family-name:var(--font-display)] text-3xl tabular-nums tracking-tight',
                isFinished ? 'text-emerald-200' : 'text-[var(--foreground)]',
              )}
            >
              {isFinished ? 'Готово!' : formatRestTime(remaining)}
            </p>
          </div>

          {isFinished ? (
            <Button type="button" onClick={dismiss} className="h-11 shrink-0">
              OK
            </Button>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label={`Минус ${SUB_SECONDS} секунд`}
                onClick={() => adjust(-SUB_SECONDS)}
                className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm tabular-nums text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
              >
                −{SUB_SECONDS}
              </button>
              <button
                type="button"
                aria-label={isPaused ? 'Продолжить' : 'Пауза'}
                onClick={() => (isPaused ? resume() : pause())}
                className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
              >
                {isPaused ? <Play className="size-5" /> : <Pause className="size-5" />}
              </button>
              <button
                type="button"
                aria-label={`Плюс ${ADD_SECONDS} секунд`}
                onClick={() => adjust(ADD_SECONDS)}
                className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm tabular-nums text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
              >
                +{ADD_SECONDS}
              </button>
              <button
                type="button"
                aria-label="Пропустить отдых"
                onClick={skip}
                className="inline-flex size-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                <X className="size-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

const PRESETS = [60, 90, 120, 180]

type Props = {
  secondsLeft: number
  running: boolean
  totalSeconds: number
  onToggle: () => void
  onSkip: () => void
  onReset: () => void
  onAdjust: (delta: number) => void
  onPreset: (seconds: number) => void
}

function formatTime(total: number) {
  const safe = Math.max(0, total)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RestTimerBar({
  secondsLeft,
  running,
  totalSeconds,
  onToggle,
  onSkip,
  onReset,
  onAdjust,
  onPreset,
}: Props) {
  const progress =
    totalSeconds > 0 ? Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100)) : 0
  const done = secondsLeft <= 0

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur md:left-60',
        done && 'border-[var(--accent)]/40',
      )}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-1000 linear',
              done ? 'bg-[var(--accent)]' : 'bg-[var(--accent)]/80',
            )}
            style={{ width: `${done ? 100 : progress}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {done ? 'Отдых закончен' : 'Отдых'}
            </p>
            <p
              className={cn(
                'font-[family-name:var(--font-display)] text-3xl tabular-nums tracking-tight',
                done && 'text-[var(--accent)]',
              )}
            >
              {formatTime(secondsLeft)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" className="px-2.5" onClick={() => onAdjust(-15)}>
              −15
            </Button>
            <Button type="button" variant="secondary" className="px-2.5" onClick={() => onAdjust(15)}>
              +15
            </Button>
            <Button type="button" variant="secondary" className="px-2.5" onClick={onToggle}>
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button type="button" variant="secondary" className="px-2.5" onClick={onReset}>
              <RotateCcw className="size-4" />
            </Button>
            <Button type="button" variant="ghost" className="px-2.5" onClick={onSkip}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onPreset(preset)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs transition',
                totalSeconds === preset
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {preset}с
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

type SessionClockProps = {
  startedAt: string
}

export function SessionClock({ startedAt }: SessionClockProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const started = new Date(startedAt).getTime()
  const elapsed = Math.max(0, Math.floor((now - started) / 1000))

  return (
    <span className="tabular-nums text-[var(--muted)]">
      В зале: {formatTime(elapsed)}
    </span>
  )
}

'use client'

import { Minus, Plus } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

type Props = {
  value: string
  onChange: (value: string) => void
  step: number
  inputMode: 'decimal' | 'numeric'
  ariaLabel: string
  disabled?: boolean
}

function decimalPlaces(value: number) {
  const asString = String(value)
  const index = asString.indexOf('.')
  return index === -1 ? 0 : asString.length - index - 1
}

function addDecimal(left: number, right: number) {
  const factor = 10 ** Math.max(decimalPlaces(left), decimalPlaces(right), 3)
  return Math.round((left + right) * factor) / factor
}

export function parseStepperValue(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '' || normalized === '.') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatStepperValue(value: number): string {
  const rounded = Math.round(Math.max(0, value) * 1000) / 1000
  if (rounded === 0) return '0'
  return String(rounded)
}

function sanitizeDecimal(raw: string) {
  const next = raw.replace(',', '.').replace(/[^\d.]/g, '')
  const dot = next.indexOf('.')
  if (dot === -1) return next
  return `${next.slice(0, dot + 1)}${next.slice(dot + 1).replace(/\./g, '')}`
}

function sanitizeInteger(raw: string) {
  return raw.replace(/\D/g, '')
}

export function NumberStepper({
  value,
  onChange,
  step,
  inputMode,
  ariaLabel,
  disabled = false,
}: Props) {
  const parsed = parseStepperValue(value)
  const atMin = parsed == null || parsed <= 0
  const safeStep = step > 0 ? step : 1

  function bump(direction: 1 | -1) {
    const current = parsed ?? 0
    const next = Math.max(0, addDecimal(current, direction * safeStep))
    onChange(formatStepperValue(next))
  }

  return (
    <div
      className={cn(
        'flex h-14 items-stretch overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        disabled={disabled || atMin}
        aria-label={`Уменьшить: ${ariaLabel}`}
        onClick={() => bump(-1)}
        className="inline-flex w-12 shrink-0 items-center justify-center text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="size-5" />
      </button>
      <input
        type="text"
        inputMode={inputMode}
        disabled={disabled}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          const next =
            inputMode === 'decimal'
              ? sanitizeDecimal(event.target.value)
              : sanitizeInteger(event.target.value)
          onChange(next)
        }}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 bg-transparent text-center font-[family-name:var(--font-display)] text-xl tabular-nums text-[var(--foreground)] outline-none"
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={`Увеличить: ${ariaLabel}`}
        onClick={() => bump(1)}
        className="inline-flex w-12 shrink-0 items-center justify-center text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="size-5" />
      </button>
    </div>
  )
}

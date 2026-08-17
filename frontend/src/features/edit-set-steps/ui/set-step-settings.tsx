'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

import { usePreferencesStore } from '@/entities/preferences/model/store'
import { cn } from '@/shared/lib/cn'
import { formatStepperValue } from '@/shared/ui/number-stepper'

const WEIGHT_PRESETS = [0.5, 1, 2.5, 5]
const REPS_PRESETS = [1, 2, 5]

export function SetStepSettings() {
  const weightStep = usePreferencesStore((s) => s.weightStep)
  const repsStep = usePreferencesStore((s) => s.repsStep)
  const setWeightStep = usePreferencesStore((s) => s.setWeightStep)
  const setRepsStep = usePreferencesStore((s) => s.setRepsStep)

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <SlidersHorizontal className="size-4 text-[var(--accent)]" />
        Шаг подходов
      </div>
      <p className="mb-5 text-sm text-[var(--muted)]">
        На сколько меняются вес и повторения по кнопкам −/+ во время тренировки.
      </p>
      <div className="space-y-5">
        <StepField
          label="Вес (кг)"
          value={weightStep}
          presets={WEIGHT_PRESETS}
          inputMode="decimal"
          onChange={setWeightStep}
        />
        <StepField
          label="Повторения"
          value={repsStep}
          presets={REPS_PRESETS}
          inputMode="numeric"
          onChange={setRepsStep}
        />
      </div>
    </section>
  )
}

function StepField({
  label,
  value,
  presets,
  inputMode,
  onChange,
}: {
  label: string
  value: number
  presets: number[]
  inputMode: 'decimal' | 'numeric'
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(formatStepperValue(value))

  useEffect(() => {
    setDraft(formatStepperValue(value))
  }, [value])

  function commit(raw: string) {
    const parsed = Number(raw.trim().replace(',', '.'))
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(formatStepperValue(value))
      return
    }
    onChange(parsed)
  }

  return (
    <div>
      <p className="mb-2 text-sm text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const active = value === preset
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={cn(
                'min-h-11 rounded-xl px-3.5 text-sm tabular-nums transition',
                active
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {formatStepperValue(preset)}
            </button>
          )
        })}
        <input
          type="text"
          inputMode={inputMode}
          aria-label={`${label}, своё значение`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit(draft)
            }
          }}
          className="min-h-11 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 text-center text-sm tabular-nums text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>
    </div>
  )
}

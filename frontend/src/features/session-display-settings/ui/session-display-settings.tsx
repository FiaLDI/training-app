'use client'

import { Dumbbell } from 'lucide-react'

import { usePreferencesStore } from '@/entities/preferences/model/store'

export function SessionDisplaySettings() {
  const showSessionExerciseImage = usePreferencesStore((s) => s.showSessionExerciseImage)
  const showSessionMuscleDiagram = usePreferencesStore((s) => s.showSessionMuscleDiagram)
  const showSessionVideo = usePreferencesStore((s) => s.showSessionVideo)
  const showSessionNotes = usePreferencesStore((s) => s.showSessionNotes)
  const setShowSessionExerciseImage = usePreferencesStore((s) => s.setShowSessionExerciseImage)
  const setShowSessionMuscleDiagram = usePreferencesStore((s) => s.setShowSessionMuscleDiagram)
  const setShowSessionVideo = usePreferencesStore((s) => s.setShowSessionVideo)
  const setShowSessionNotes = usePreferencesStore((s) => s.setShowSessionNotes)

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Dumbbell className="size-4 text-[var(--accent)]" />
        Экран тренировки
      </div>
      <p className="mb-5 text-sm text-[var(--muted)]">
        Что показывать в карточке упражнения во время тренировки.
      </p>

      <div className="space-y-4">
        <ToggleRow
          label="Изображение упражнения"
          description="Главное фото из источников. На 2G и в режиме экономии трафика не загружается."
          checked={showSessionExerciseImage}
          onChange={setShowSessionExerciseImage}
        />
        <ToggleRow
          label="Схема мышц"
          description="Диаграмма задействованных мышечных групп."
          checked={showSessionMuscleDiagram}
          onChange={setShowSessionMuscleDiagram}
        />
        <ToggleRow
          label="Видео"
          description="Видеоролики и таймкоды из источников упражнения."
          checked={showSessionVideo}
          onChange={setShowSessionVideo}
        />
        <ToggleRow
          label="Заметки по технике"
          description="Индивидуальные заметки: хват, высота сиденья и т.д."
          checked={showSessionNotes}
          onChange={setShowSessionNotes}
        />
      </div>
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-[var(--border)] accent-[var(--accent)]"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-[var(--foreground)]">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-[var(--muted)]">{description}</span>
        ) : null}
      </span>
    </label>
  )
}

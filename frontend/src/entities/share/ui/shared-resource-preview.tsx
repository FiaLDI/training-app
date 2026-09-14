import { dayOfWeekLabel } from '@/shared/lib/day-of-week'
import type { ProgramSnapshot, SnapshotTemplate, SharedResource } from '@/entities/share/model/types'

function TemplatePreview({ template }: { template: SnapshotTemplate }) {
  const exercises = [...template.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder)
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="font-[family-name:var(--font-display)] text-lg">{template.name}</h3>
      {template.description ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{template.description}</p>
      ) : null}
      <ul className="mt-3 space-y-1.5 text-sm">
        {exercises.map((item) => (
          <li key={`${item.exerciseName}-${item.exerciseOrder}`} className="flex justify-between gap-3">
            <span>{item.exerciseName}</span>
            <span className="shrink-0 tabular-nums text-[var(--muted)]">
              {item.targetSets}×
              {item.minReps != null && item.maxReps != null
                ? item.minReps === item.maxReps
                  ? item.minReps
                  : `${item.minReps}–${item.maxReps}`
                : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProgramSnapshotPreview({ snapshot }: { snapshot: ProgramSnapshot }) {
  return (
    <div className="space-y-4">
      {snapshot.days.map((day) => (
        <section key={`${day.dayOfWeek}-${day.slotOrder}`}>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            {dayOfWeekLabel(day.dayOfWeek)}
          </p>
          {day.template ? (
            <TemplatePreview template={day.template} />
          ) : (
            <p className="text-sm text-[var(--muted)]">Отдых</p>
          )}
        </section>
      ))}
    </div>
  )
}

export function SharedResourcePreview({ resource }: { resource: SharedResource }) {
  if (resource.kind === 'template') {
    return <TemplatePreview template={resource.template} />
  }
  return <ProgramSnapshotPreview snapshot={resource.program} />
}

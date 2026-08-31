'use client'

import {
  MUSCLE_GROUPS,
  PRIMARY_MUSCLE_WEIGHT,
  SECONDARY_MUSCLE_WEIGHT,
  togglePrimaryMuscleGroup,
  toggleSecondaryMuscleGroup,
  type MuscleGroup,
} from '@/entities/exercise/model/muscle-groups'
import { cn } from '@/shared/lib/cn'

type Props = {
  value: MuscleGroup[]
  onChange: (groups: MuscleGroup[]) => void
}

function GroupChips({
  selected,
  hidden,
  onToggle,
  activeClassName,
}: {
  selected: (group: MuscleGroup) => boolean
  hidden?: (group: MuscleGroup) => boolean
  onToggle: (group: MuscleGroup) => void
  activeClassName: string
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {MUSCLE_GROUPS.map((group) => {
        if (hidden?.(group)) return null
        const isSelected = selected(group)
        return (
          <button
            key={group}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onToggle(group)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm transition',
              isSelected
                ? activeClassName
                : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]',
            )}
          >
            {group}
          </button>
        )
      })}
    </div>
  )
}

export function MuscleGroupPicker({ value, onChange }: Props) {
  const primary = value[0] ?? null
  const secondary = new Set(value.slice(1))

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs text-[var(--muted)]">
          Основная группа · ×{PRIMARY_MUSCLE_WEIGHT}
        </p>
        <GroupChips
          selected={(group) => group === primary}
          onToggle={(group) => onChange(togglePrimaryMuscleGroup(value, group))}
          activeClassName="border-[var(--accent)]/50 bg-[var(--accent)]/15 text-[var(--accent)]"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-[var(--muted)]">
          Дополнительные · ×{SECONDARY_MUSCLE_WEIGHT}
        </p>
        <GroupChips
          selected={(group) => secondary.has(group)}
          hidden={(group) => group === primary}
          onToggle={(group) => onChange(toggleSecondaryMuscleGroup(value, group))}
          activeClassName="border-[var(--foreground)]/20 bg-[var(--surface-2)] text-[var(--foreground)]"
        />
      </div>
    </div>
  )
}

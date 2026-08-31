import type { MuscleGroup } from '@/entities/exercise/model/muscle-groups'
import { cn } from '@/shared/lib/cn'

type Props = {
  groups: MuscleGroup[]
  className?: string
}

export function MuscleGroupBadges({ groups, className }: Props) {
  if (groups.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2 text-xs text-[var(--muted)]', className)}>
      {groups.map((group, index) => {
        const isPrimary = index === 0
        return (
          <span
            key={group}
            className={cn(
              'rounded-md px-2 py-1',
              isPrimary && groups.length > 1
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'bg-[var(--surface-2)] text-[var(--foreground)]',
            )}
          >
            {group}
            {isPrimary && groups.length > 1 ? (
              <span className="ml-1 opacity-70">осн.</span>
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

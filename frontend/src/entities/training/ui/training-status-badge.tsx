import type { TrainingStatus } from '@/entities/training/model/types'
import { cn } from '@/shared/lib/cn'

const styles: Record<TrainingStatus, string> = {
  planned: 'bg-sky-500/15 text-sky-300',
  in_progress: 'bg-[var(--accent)]/15 text-[var(--accent)]',
  finished: 'bg-emerald-500/15 text-emerald-300',
  cancelled: 'bg-zinc-500/20 text-zinc-400',
}

const labels: Record<TrainingStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  finished: 'Finished',
  cancelled: 'Cancelled',
}

type Props = {
  status: TrainingStatus
  className?: string
}

export function TrainingStatusBadge({ status, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-1 text-xs font-medium capitalize',
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  )
}

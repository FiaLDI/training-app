import { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type Props = {
  children: ReactNode
  className?: string
}

export function EmptyState({ children, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 px-6 py-14 text-center text-sm text-[var(--muted)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

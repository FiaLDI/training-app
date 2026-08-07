import { SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

type Props = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, children, ...props }: Props) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

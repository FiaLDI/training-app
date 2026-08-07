import { TextareaHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>

export function Textarea({ className, ...props }: Props) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20 min-h-24 resize-y',
        className,
      )}
      {...props}
    />
  )
}

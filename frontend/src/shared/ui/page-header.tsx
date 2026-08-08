import { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

type Props = {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: Props) {
  return (
    <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--foreground)] md:text-4xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-xl text-sm text-[var(--muted)]">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

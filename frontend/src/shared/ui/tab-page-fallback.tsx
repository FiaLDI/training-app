import { cn } from '@/shared/lib/cn'

import { CardGridSkeleton, ListSkeleton, Skeleton } from './skeleton'

export type TabPageFallbackVariant = 'dashboard' | 'grid' | 'list' | 'stats' | 'week' | 'search-grid'

type Props = {
  title: string
  variant?: TabPageFallbackVariant
  withHeader?: boolean
  className?: string
}

function HeaderSkeleton() {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Skeleton className="h-9 w-40 md:h-10 md:w-48" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
  )
}

export function TabPageFallback({
  title,
  variant = 'list',
  withHeader = true,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'tab-content-slot',
        variant === 'dashboard' && 'mx-auto max-w-lg',
        className,
      )}
      aria-busy="true"
      aria-label={`Загрузка: ${title}`}
    >
      {withHeader ? <HeaderSkeleton /> : null}

      {variant === 'dashboard' ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : null}

      {variant === 'grid' || variant === 'search-grid' ? (
        <>
          {variant === 'search-grid' ? (
            <Skeleton className="mb-6 h-10 w-full max-w-md rounded-xl" />
          ) : null}
          <CardGridSkeleton />
        </>
      ) : null}

      {variant === 'list' ? <ListSkeleton /> : null}

      {variant === 'stats' ? (
        <div className="space-y-6">
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : null}

      {variant === 'week' ? (
        <div className="space-y-5">
          <Skeleton className="h-11 w-64 rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : null}
    </div>
  )
}

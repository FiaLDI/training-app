import { cn } from '@/shared/lib/cn'

type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-pulse rounded-md bg-[var(--surface-2)]',
        className,
      )}
    />
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({
  count = 5,
  dense = false,
}: {
  count?: number
  dense?: boolean
}) {
  return (
    <ul className={cn(dense ? 'space-y-2' : 'space-y-3')} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            {!dense ? <Skeleton className="h-3 w-28 max-w-[70%]" /> : null}
          </div>
          <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

export function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-6 mb-8 flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <Skeleton className="mb-3 h-6 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
          >
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-28" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

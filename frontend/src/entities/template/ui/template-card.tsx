import Link from 'next/link'

import type { WorkoutTemplate } from '@/entities/template/model/types'

type Props = {
  template: WorkoutTemplate
}

export function TemplateCard({ template }: Props) {
  return (
    <Link
      href={`/plans/${template.id}`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)]"
    >
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--foreground)]">
        {template.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">
        {template.description || 'Без описания'}
      </p>
    </Link>
  )
}

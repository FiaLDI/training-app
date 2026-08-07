'use client'

import { useEffect } from 'react'

import { CreateTemplateForm } from '@/features/create-template/ui/create-template-form'
import { TemplateCard } from '@/entities/template/ui/template-card'
import { useTemplateStore } from '@/entities/template/model/store'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { CardGridSkeleton } from '@/shared/ui/skeleton'

export function TemplatesPage() {
  const items = useTemplateStore((s) => s.items)
  const loading = useTemplateStore((s) => s.loading)
  const error = useTemplateStore((s) => s.error)
  const fetchList = useTemplateStore((s) => s.fetchList)

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable workout blueprints."
        action={<CreateTemplateForm />}
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {loading && items.length === 0 ? (
        <CardGridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState>No templates yet. Create one and add exercises.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}

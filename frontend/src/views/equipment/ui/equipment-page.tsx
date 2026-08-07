'use client'

import { useEffect } from 'react'
import { Trash2 } from 'lucide-react'

import { CreateEquipmentForm } from '@/features/create-equipment/ui/create-equipment-form'
import { useEquipmentStore } from '@/entities/equipment/model/store'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function EquipmentPage() {
  const items = useEquipmentStore((s) => s.items)
  const loading = useEquipmentStore((s) => s.loading)
  const error = useEquipmentStore((s) => s.error)
  const fetchList = useEquipmentStore((s) => s.fetchList)
  const remove = useEquipmentStore((s) => s.remove)

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  return (
    <div>
      <PageHeader
        title="Инвентарь"
        description="Каталог спортивного оборудования для упражнений."
        action={<CreateEquipmentForm onCreated={() => void fetchList()} />}
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}
      {loading && items.length === 0 ? (
        <ListSkeleton dense count={4} />
      ) : items.length === 0 ? (
        <EmptyState>Пока нет инвентаря. Добавь первый предмет.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <span className="text-sm text-[var(--foreground)]">{item.name}</span>
              <Button type="button" variant="ghost" onClick={() => void remove(item.id)}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

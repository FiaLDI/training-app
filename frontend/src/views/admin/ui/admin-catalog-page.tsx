'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { AdminSystemCatalogPanel } from '@/features/manage-system-catalog/ui/admin-system-catalog-panel'
import { PageHeader } from '@/shared/ui/page-header'

export function AdminCatalogPage() {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const user = useSessionStore((s) => s.user)
  const hydrated = useSessionStore((s) => s.hydrated)
  const admin = isAdmin(user)

  useEffect(() => {
    if (!hydrated) return
    if (mode !== 'cloud' || !admin) {
      router.replace('/')
    }
  }, [hydrated, mode, admin, router])

  if (!hydrated || mode !== 'cloud' || !admin) {
    return (
      <div className="text-sm text-[var(--muted)]">Перенаправление…</div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Системный каталог"
        description="Выгрузка и импорт seed-архива системных упражнений вместе с главными изображениями."
      />
      <AdminSystemCatalogPanel />
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { AdminUsersPanel } from '@/features/manage-users/ui/admin-users-panel'
import { PageHeader } from '@/shared/ui/page-header'

export function AdminUsersPage() {
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
        title="Админ-панель"
        description="Управление пользователями и доступом к облаку."
      />

      <div className="mb-4">
        <h2 className="text-sm font-medium text-[var(--foreground)]">Пользователи</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Список аккаунтов без кодов входа. Выдача и сброс кода — один раз с копированием.
        </p>
      </div>

      <AdminUsersPanel />
    </div>
  )
}

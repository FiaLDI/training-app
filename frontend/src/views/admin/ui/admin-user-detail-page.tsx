'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import type { AdminUser } from '@/entities/session/api/auth-api'
import { isAdmin } from '@/entities/session/model/is-admin'
import { useSessionStore } from '@/entities/session/model/store'
import { AdminUserDetailPanel } from '@/features/manage-users/ui/admin-user-detail-panel'
import { getAdminUser } from '@/features/manage-users/model/manage-users'
import { PageHeader } from '@/shared/ui/page-header'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  id: string
}

type LoadState = {
  id: string
  user: AdminUser | null
  error: string | null
}

export function AdminUserDetailPage({ id }: Props) {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const sessionUser = useSessionStore((s) => s.user)
  const hydrated = useSessionStore((s) => s.hydrated)
  const admin = isAdmin(sessionUser)
  const [state, setState] = useState<LoadState | null>(null)

  useEffect(() => {
    if (!hydrated) return
    if (mode !== 'cloud' || !admin) {
      router.replace('/')
    }
  }, [hydrated, mode, admin, router])

  useEffect(() => {
    if (!hydrated || mode !== 'cloud' || !admin) return
    let cancelled = false
    void getAdminUser(id)
      .then((item) => {
        if (!cancelled) setState({ id, user: item, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            id,
            user: null,
            error: err instanceof Error ? err.message : 'Не удалось загрузить пользователя',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, hydrated, mode, admin])

  if (!hydrated || mode !== 'cloud' || !admin) {
    return (
      <div className="text-sm text-[var(--muted)]">Перенаправление…</div>
    )
  }

  const current = state?.id === id ? state : null
  if (!current) return <DetailSkeleton />

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Пользователи
      </Link>

      <PageHeader
        title={current.user?.email ?? 'Аккаунт'}
        description="Email и имя можно изменить. Админов удалять нельзя."
      />

      {current.error && !current.user ? (
        <p className="text-sm text-red-500">{current.error}</p>
      ) : current.user ? (
        <AdminUserDetailPanel
          key={current.user.id}
          user={current.user}
          onUpdated={(user) => setState({ id, user, error: null })}
        />
      ) : null}
    </div>
  )
}

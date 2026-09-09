'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { AdminUser } from '@/entities/session/api/auth-api'
import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'
import { ConfirmModal } from '@/shared/ui/confirm-modal'
import { Input } from '@/shared/ui/input'

import { deleteAdminUser, updateAdminUser } from '../model/manage-users'

type Props = {
  user: AdminUser
  onUpdated: (user: AdminUser) => void
}

export function AdminUserDetailPanel({ user, onUpdated }: Props) {
  const router = useRouter()
  const currentUserId = useSessionStore((s) => s.user?.id)
  const refreshUser = useSessionStore((s) => s.refreshUser)
  const [email, setEmail] = useState(user.email)
  const [username, setUsername] = useState(user.username)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const isAdminAccount = user.role === 'admin'
  const isSelf = currentUserId != null && user.id === currentUserId

  async function onSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateAdminUser(user.id, {
        email,
        username,
      })
      onUpdated(updated)
      setEmail(updated.email)
      setUsername(updated.username)
      if (isSelf) await refreshUser()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  async function onConfirmDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteAdminUser(user.id)
      router.replace('/admin/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить аккаунт')
      setDeleteOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <dl className="mb-5 space-y-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[var(--muted)]">Роль</dt>
          <dd>{user.role === 'admin' ? 'admin' : 'user'}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[var(--muted)]">Создан</dt>
          <dd>{new Date(user.createdAt).toLocaleString('ru-RU')}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[var(--muted)]">Последний вход</dt>
          <dd>
            {user.lastLoginAt
              ? new Date(user.lastLoginAt).toLocaleString('ru-RU')
              : '—'}
          </dd>
        </div>
      </dl>

      <form className="space-y-4" onSubmit={(event) => void onSave(event)}>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--muted)]">Имя пользователя</span>
          <Input
            required
            maxLength={64}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {saved ? (
          <p className="text-sm text-[var(--muted)]">Сохранено</p>
        ) : null}

        <Button type="submit" disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </form>

      <div className="mt-8 border-t border-[var(--border)] pt-5">
        {isAdminAccount ? (
          <p className="text-sm text-[var(--muted)]">
            Админ-аккаунт удалить нельзя
          </p>
        ) : (
          <Button
            type="button"
            variant="danger"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            Удалить аккаунт
          </Button>
        )}
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={() => void onConfirmDelete()}
        title="Удалить аккаунт?"
        description={`Пользователь ${user.email} и все его данные будут удалены без восстановления.`}
        confirmLabel="Удалить"
        confirmVariant="danger"
        pending={deleting}
      />
    </section>
  )
}

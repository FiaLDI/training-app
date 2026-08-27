'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound } from 'lucide-react'

import type { AdminUser } from '@/entities/session/api/auth-api'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'

import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserCode,
} from '../model/manage-users'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('ru-RU')
}

type DialogState =
  | { type: 'reset-confirm'; user: AdminUser }
  | { type: 'issued'; email: string; loginCode: string; reason: 'create' | 'reset' }

export function AdminUsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    setUsers(await listAdminUsers())
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  function closeDialog() {
    if (creating || resetting) return
    setDialog(null)
    setCopied(false)
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    setCopied(false)
    try {
      const result = await createAdminUser(email)
      setEmail('')
      await refresh()
      setDialog({
        type: 'issued',
        email: result.email,
        loginCode: result.loginCode,
        reason: 'create',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать пользователя')
    } finally {
      setCreating(false)
    }
  }

  async function onConfirmReset() {
    if (dialog?.type !== 'reset-confirm') return
    const user = dialog.user
    setResetting(true)
    setError(null)
    setCopied(false)
    try {
      const result = await resetAdminUserCode(user.id)
      await refresh()
      setDialog({
        type: 'issued',
        email: result.email,
        loginCode: result.loginCode,
        reason: 'reset',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сбросить код')
      setDialog(null)
    } finally {
      setResetting(false)
    }
  }

  async function copyIssued() {
    if (dialog?.type !== 'issued') return
    try {
      await navigator.clipboard.writeText(dialog.loginCode)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const dialogPending = creating || resetting

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <form className="mb-5 flex flex-col gap-2 sm:flex-row" onSubmit={onCreate}>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="новый@email.com"
          className="sm:flex-1"
        />
        <Button type="submit" disabled={creating}>
          {creating ? 'Создание…' : 'Создать и выдать код'}
        </Button>
      </form>

      {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted)]">Загрузка…</p> : null}

      {!loading && users.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Пользователей пока нет.</p>
      ) : null}

      <ul className="space-y-3">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{user.email}</p>
              <p className="text-[var(--muted)]">
                создан {formatDate(user.createdAt)} · вход {formatDate(user.lastLoginAt)}
                {user.role === 'admin' ? ' · admin' : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={resetting}
              onClick={() => setDialog({ type: 'reset-confirm', user })}
            >
              <KeyRound className="size-4" />
              Сбросить код
            </Button>
          </li>
        ))}
      </ul>

      <Modal
        open={dialog !== null}
        onClose={closeDialog}
        closeDisabled={dialogPending}
        title={
          dialog?.type === 'issued'
            ? 'Код входа'
            : 'Сбросить код входа?'
        }
        description={
          dialog?.type === 'reset-confirm'
            ? `Для ${dialog.user.email} будет выдан новый код. Все активные сессии пользователя будут отозваны.`
            : dialog?.type === 'issued'
              ? dialog.reason === 'create'
                ? `Пользователь ${dialog.email} создан. Скопируйте код сейчас — он больше не покажется.`
                : `Новый код для ${dialog.email}. Скопируйте его сейчас — он больше не покажется.`
              : undefined
        }
        footer={
          dialog?.type === 'reset-confirm' ? (
            <>
              <Button type="button" variant="ghost" onClick={closeDialog} disabled={dialogPending}>
                Отмена
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void onConfirmReset()}
                disabled={dialogPending}
              >
                {resetting ? 'Подождите…' : 'Сбросить'}
              </Button>
            </>
          ) : dialog?.type === 'issued' ? (
            <>
              <Button type="button" variant="secondary" onClick={() => void copyIssued()}>
                <Copy className="size-4" />
                {copied ? 'Скопировано' : 'Скопировать'}
              </Button>
              <Button type="button" onClick={closeDialog}>
                Готово
              </Button>
            </>
          ) : null
        }
      >
        {dialog?.type === 'issued' ? (
          <p className="break-all rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-3 font-mono text-sm">
            {dialog.loginCode}
          </p>
        ) : null}
      </Modal>
    </section>
  )
}

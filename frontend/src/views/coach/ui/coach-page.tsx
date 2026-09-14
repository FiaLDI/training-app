'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, UserPlus, Users } from 'lucide-react'

import { coachApi } from '@/entities/coach/api/coach-api'
import type { CoachInvite, CoachPerson } from '@/entities/coach/model/types'
import { CloudRequired } from '@/shared/ui/cloud-required'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'
import { ListSkeleton } from '@/shared/ui/skeleton'

export function CoachPage() {
  return (
    <CloudRequired action="Кабинет тренера работает в облачном аккаунте.">
      <CoachDashboard />
    </CloudRequired>
  )
}

function CoachDashboard() {
  const [trainees, setTrainees] = useState<CoachPerson[]>([])
  const [coaches, setCoaches] = useState<CoachPerson[]>([])
  const [invites, setInvites] = useState<CoachInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    const [t, c, i] = await Promise.all([
      coachApi.listTrainees(),
      coachApi.listCoaches(),
      coachApi.listInvites(),
    ])
    setTrainees(t.items)
    setCoaches(c.items)
    setInvites(i.items)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void reload()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function createInvite() {
    setBusy(true)
    setError(null)
    try {
      await coachApi.createInvite()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать код')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
  }

  async function onJoin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await coachApi.join(joinCode)
      setJoinCode('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться')
    } finally {
      setBusy(false)
    }
  }

  async function endRelationship(id: string) {
    setBusy(true)
    try {
      await coachApi.endRelationship(id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отключить')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Кабинет тренера" />
        <ListSkeleton count={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Кабинет тренера"
        description="Пригласите подопечных, назначьте программу и комментируйте подходы."
        action={
          <Button type="button" disabled={busy} onClick={() => void createInvite()}>
            <UserPlus className="size-4" />
            Код приглашения
          </Button>
        }
      />

      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      {invites.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">Коды приглашения</h2>
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-mono tracking-widest">{invite.code}</span>
                <span className="flex gap-2">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => void copyCode(invite.code)}
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={busy}
                    onClick={() => void coachApi.revokeInvite(invite.id).then(reload)}
                  >
                    Отозвать
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-xl">
          <Users className="size-5 text-[var(--accent)]" />
          Подопечные
        </h2>
        {trainees.length === 0 ? (
          <EmptyState>Пока никого нет. Создайте код и отправьте его ученику.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {trainees.map((person) => (
              <li key={person.relationshipId}>
                <Link
                  href={`/coach/trainees/${person.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]/40"
                >
                  <span>
                    <span className="block font-medium">{person.username}</span>
                    <span className="text-xs text-[var(--muted)]">{person.email}</span>
                  </span>
                  <span className="text-xs text-[var(--muted)]">Открыть</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">Я подопечный</h2>
        <form onSubmit={onJoin} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
            placeholder="Код от тренера"
            aria-label="Код приглашения"
          />
          <Button type="submit" disabled={busy || !joinCode.trim()}>
            Присоединиться
          </Button>
        </form>
        {coaches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Тренер пока не подключён.</p>
        ) : (
          <ul className="space-y-2">
            {coaches.map((person) => (
              <li
                key={person.relationshipId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span>
                  {person.username}{' '}
                  <span className="text-[var(--muted)]">({person.email})</span>
                </span>
                <Button
                  variant="ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => void endRelationship(person.relationshipId)}
                >
                  Отключить
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

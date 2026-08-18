'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cloud, HardDrive, LogOut, User } from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import { ClearLocalDataActions } from '@/features/clear-local-data/ui/clear-local-data-actions'
import { SetStepSettings } from '@/features/edit-set-steps/ui/set-step-settings'
import {
  formatPendingSummary,
  getPendingSyncSummary,
} from '@/features/sync-trainings/model/pending-summary'
import { SyncTrainingsDialog } from '@/features/sync-trainings/ui/sync-trainings-dialog'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'

function modeLabel(mode: 'local' | 'cloud' | null) {
  if (mode === 'local') return 'Локальный режим'
  if (mode === 'cloud') return 'Облачный режим'
  return 'Не выбран'
}

export function SettingsPage() {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const user = useSessionStore((s) => s.user)
  const switchMode = useSessionStore((s) => s.switchMode)
  const [syncOpen, setSyncOpen] = useState(false)
  const [summary, setSummary] = useState(() => getPendingSyncSummary())

  useEffect(() => {
    setSummary(getPendingSyncSummary())
  }, [syncOpen, mode])

  async function onSwitchMode() {
    await switchMode()
    router.replace('/login')
  }

  return (
    <div>
      <PageHeader
        title="Профиль и настройки"
        description="Аккаунт, шаги подходов, синхронизация и локальные данные на устройстве."
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <User className="size-4 text-[var(--accent)]" />
            Профиль
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-[var(--muted)]">Режим</dt>
              <dd>{modeLabel(mode)}</dd>
            </div>
            {mode === 'cloud' && user ? (
              <>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[var(--muted)]">Email</dt>
                  <dd className="truncate">{user.email}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[var(--muted)]">Имя пользователя</dt>
                  <dd>{user.username}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-[var(--muted)]">Аккаунт с</dt>
                  <dd>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</dd>
                </div>
              </>
            ) : (
              <p className="text-[var(--muted)]">
                Данные хранятся только на этом устройстве. Войдите в облако, чтобы синхронизировать
                между устройствами.
              </p>
            )}
          </dl>
        </section>

        {mode === 'cloud' ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Cloud className="size-4 text-[var(--accent)]" />
              Синхронизация
            </div>
            {summary.total > 0 ? (
              <p className="mb-3 text-sm text-[var(--muted)]">
                Не отправлено: {formatPendingSummary(summary)}. Обычно уходит само при появлении
                сети — кнопка для ручной отправки.
              </p>
            ) : (
              <p className="mb-3 text-sm text-[var(--muted)]">Все локальные данные синхронизированы.</p>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={summary.total === 0}
              onClick={() => setSyncOpen(true)}
            >
              Отправить на сервер
            </Button>
            <SyncTrainingsDialog
              open={syncOpen}
              onClose={() => setSyncOpen(false)}
              onCompleted={() => setSummary(getPendingSyncSummary())}
            />
          </section>
        ) : null}

        <SetStepSettings />

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <HardDrive className="size-4 text-[var(--accent)]" />
            Локальные данные
          </div>
          <ClearLocalDataActions />
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <Button type="button" variant="ghost" className="w-full justify-start px-0" onClick={() => void onSwitchMode()}>
            <LogOut className="size-4" />
            Сменить режим / выйти
          </Button>
        </section>
      </div>
    </div>
  )
}

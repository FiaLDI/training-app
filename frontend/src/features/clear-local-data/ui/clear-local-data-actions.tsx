'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eraser, Trash2 } from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import {
  clearAllLocalDataAndReset,
  clearPendingAndReset,
} from '@/features/clear-local-data/model/clear-local-data'
import {
  formatPendingSummary,
  getPendingSyncSummary,
} from '@/features/sync-trainings/model/pending-summary'
import { Button } from '@/shared/ui/button'

export function ClearLocalDataActions() {
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const summary = getPendingSyncSummary()

  async function onClearPending() {
    if (summary.total === 0) {
      setMessage('Неотправленных изменений нет.')
      return
    }
    const ok = window.confirm(
      `Удалить неотправленные изменения (${formatPendingSummary(summary)})? Данные на сервере не затронуты.`,
    )
    if (!ok) return

    setPending(true)
    setError(null)
    setMessage(null)
    try {
      await clearPendingAndReset(mode === 'cloud')
      setMessage('Неотправленные изменения удалены.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось очистить')
    } finally {
      setPending(false)
    }
  }

  async function onClearAll() {
    const ok = window.confirm(
      'Удалить все локальные данные на этом устройстве? Тренировки, планы и упражнения исчезнут из приложения. Аккаунт и данные на сервере не удаляются.',
    )
    if (!ok) return

    setPending(true)
    setError(null)
    setMessage(null)
    try {
      await clearAllLocalDataAndReset(mode === 'cloud')
      setMessage('Локальные данные очищены.')
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось очистить')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        className="w-full justify-start"
        disabled={pending || summary.total === 0}
        onClick={() => void onClearPending()}
      >
        <Eraser className="size-4" />
        Удалить неотправленные изменения
        {summary.total > 0 ? ` (${summary.total})` : ''}
      </Button>
      <p className="text-xs text-[var(--muted)]">
        Удаляет локальные тренировки, планы и упражнения, которые ещё не отправлены на сервер.
      </p>

      <Button
        type="button"
        variant="danger"
        className="w-full justify-start"
        disabled={pending}
        onClick={() => void onClearAll()}
      >
        <Trash2 className="size-4" />
        Очистить все локальные данные
      </Button>
      <p className="text-xs text-[var(--muted)]">
        Полная очистка кэша на устройстве. В облачном режиме каталог упражнений подтянется с сервера
        заново.
      </p>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'

import {
  formatPendingSummary,
  getPendingSyncSummary,
  type PendingSyncSummary,
} from '../model/pending-summary'
import { useSyncNoticeStore } from '../model/sync-notice-store'
import { SyncTrainingsDialog } from './sync-trainings-dialog'

export function SyncPendingBanner() {
  const mode = useSessionStore((s) => s.mode)
  const message = useSyncNoticeStore((s) => s.message)
  const showBanner = useSyncNoticeStore((s) => s.showBanner)
  const dismissBanner = useSyncNoticeStore((s) => s.dismissBanner)
  const setShowBanner = useSyncNoticeStore((s) => s.setShowBanner)
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<PendingSyncSummary>(() => getPendingSyncSummary())

  function refresh() {
    setSummary(getPendingSyncSummary())
  }

  useEffect(() => {
    refresh()
  }, [mode, showBanner, open, message])

  useEffect(() => {
    if (mode === 'cloud' && getPendingSyncSummary().total > 0) {
      setShowBanner(true)
    }
  }, [mode, setShowBanner])

  const visible = mode === 'cloud' && showBanner && (summary.total > 0 || Boolean(message))

  return (
    <>
      {visible ? (
        <div className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-[var(--foreground)]">
                {message ??
                  (summary.total > 0
                    ? `Не отправлено на сервер: ${formatPendingSummary(summary)}`
                    : null)}
              </p>
              {summary.total > 0 ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Можно выбрать планы, упражнения и тренировки перед отправкой.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="ghost" className="px-3" onClick={dismissBanner}>
                Скрыть
              </Button>
              {summary.total > 0 ? (
                <Button type="button" className="px-3" onClick={() => setOpen(true)}>
                  Отправить на сервер
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <SyncTrainingsDialog
        open={open}
        onClose={() => {
          setOpen(false)
          refresh()
          if (getPendingSyncSummary().total === 0) dismissBanner()
        }}
        onCompleted={refresh}
      />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { CloudUpload } from 'lucide-react'

import { useSessionStore } from '@/entities/session/model/store'
import { Button } from '@/shared/ui/button'

import {
  formatPendingSummary,
  getPendingSyncSummary,
} from '../model/pending-summary'
import { SyncTrainingsDialog } from './sync-trainings-dialog'

export function SyncSidebarButton() {
  const mode = useSessionStore((s) => s.mode)
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState(() => getPendingSyncSummary())

  function refresh() {
    setSummary(getPendingSyncSummary())
  }

  useEffect(() => {
    refresh()
  }, [mode, open])

  if (mode !== 'cloud' || summary.total === 0) return null

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="mt-2 w-full justify-start px-2"
        onClick={() => setOpen(true)}
        title={formatPendingSummary(summary)}
      >
        <CloudUpload className="size-4" />
        Отправить на сервер ({summary.total})
      </Button>
      <SyncTrainingsDialog
        open={open}
        onClose={() => setOpen(false)}
        onCompleted={refresh}
      />
    </>
  )
}

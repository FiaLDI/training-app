'use client'

import { ReactNode, useEffect } from 'react'

import { startBackgroundSyncListeners } from '@/features/sync-trainings/model/background-sync'
import { SyncPendingBanner } from '@/features/sync-trainings/ui/sync-pending-banner'

import { Sidebar } from './sidebar'

type Props = {
  children: ReactNode
}

export function AppShell({ children }: Props) {
  useEffect(() => {
    startBackgroundSyncListeners()
  }, [])

  return (
    <div className="relative min-h-screen md:flex md:items-stretch">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(163,230,53,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_40%)] "
      />
      <Sidebar />
      <main className="relative flex-1 px-4 py-6 md:px-8 md:py-10">
        <SyncPendingBanner />
        {children}
      </main>
    </div>
  )
}

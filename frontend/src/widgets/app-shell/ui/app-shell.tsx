'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname } from 'next/navigation'

import { startBackgroundSyncListeners } from '@/features/sync-trainings/model/background-sync'
import { SyncPendingBanner } from '@/features/sync-trainings/ui/sync-pending-banner'

import { isTabRoute } from '../model/nav-links'
import { PageTransition } from './page-transition'
import { Sidebar } from './sidebar'

type Props = {
  children: ReactNode
  hideNav?: boolean
}

export function AppShell({ children, hideNav = false }: Props) {
  const pathname = usePathname()

  useEffect(() => {
    startBackgroundSyncListeners()
  }, [])

  useEffect(() => {
    if (!hideNav) {
      window.scrollTo(0, 0)
    }
  }, [pathname, hideNav])

  const animateTabs = !hideNav && isTabRoute(pathname)

  return (
    <div className={hideNav ? 'relative min-h-screen' : 'relative min-h-screen md:flex md:items-stretch'}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(163,230,53,0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,rgba(34,211,238,0.08),transparent_40%)] "
      />
      {hideNav ? null : <Sidebar />}
      <main className="relative flex min-w-0 flex-1 flex-col px-4 py-6 md:px-8 md:py-10">
        {hideNav ? null : <SyncPendingBanner />}
        <PageTransition pathname={pathname} enabled={animateTabs}>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}

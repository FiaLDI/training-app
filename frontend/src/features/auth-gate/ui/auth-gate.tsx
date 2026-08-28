'use client'

import { ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { useSessionStore } from '@/entities/session/model/store'
import { syncStorageScopeFromSession } from '@/entities/session/lib/session-boundary'
import { AppShell } from '@/widgets/app-shell/ui/app-shell'

type Props = {
  children: ReactNode
}

function isTrainingSessionPath(pathname: string) {
  return /^\/trainings\/[^/]+$/.test(pathname)
}

function isPublicPath(pathname: string) {
  return pathname === '/login' || pathname === '/~offline'
}

export function AuthGate({ children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const mode = useSessionStore((s) => s.mode)
  const hydrated = useSessionStore((s) => s.hydrated)
  const setHydrated = useSessionStore((s) => s.setHydrated)
  const refreshUser = useSessionStore((s) => s.refreshUser)

  useEffect(() => {
    // persist may already be rehydrated before mount
    if (useSessionStore.persist.hasHydrated()) {
      const { mode, user } = useSessionStore.getState()
      syncStorageScopeFromSession(mode, user?.id ?? null)
      setHydrated(true)
    }
  }, [setHydrated])

  useEffect(() => {
    if (!hydrated) return
    if (!mode && !isPublicPath(pathname)) {
      router.replace('/login')
    }
    if (mode && pathname === '/login') {
      router.replace('/')
    }
  }, [hydrated, mode, pathname, router])

  useEffect(() => {
    if (!hydrated || mode !== 'cloud') return
    void refreshUser()
  }, [hydrated, mode, refreshUser])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Загрузка…
      </div>
    )
  }

  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  if (!mode) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Перенаправление…
      </div>
    )
  }

  return <AppShell hideNav={isTrainingSessionPath(pathname)}>{children}</AppShell>
}

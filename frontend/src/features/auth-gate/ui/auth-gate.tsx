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
    const finishHydration = () => {
      const { mode, user } = useSessionStore.getState()
      syncStorageScopeFromSession(mode, user?.id ?? null)
      setHydrated(true)
    }

    // Subscribe first, then check — otherwise a sync rehydrate between the two
    // never fires onFinishHydration and the gate stays on «Загрузка…».
    const unsub = useSessionStore.persist.onFinishHydration(finishHydration)
    if (useSessionStore.persist.hasHydrated()) {
      finishHydration()
    }

    const fallback = window.setTimeout(finishHydration, 1500)
    return () => {
      unsub()
      window.clearTimeout(fallback)
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

  if (isPublicPath(pathname)) {
    return <>{children}</>
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Загрузка…
      </div>
    )
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

'use client'

import { ReactNode, useEffect, useState } from 'react'
import { SerwistProvider } from '@serwist/turbopack/react'

const isDev = process.env.NODE_ENV === 'development'

type Props = {
  children: ReactNode
}

/** In dev, unregister stale SW so Turbopack/HMR chunks are not served from cache. */
function useDevServiceWorkerCleanup() {
  const [ready, setReady] = useState(!isDev)

  useEffect(() => {
    if (!isDev || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setReady(true)
      return
    }

    let cancelled = false

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (cancelled) return
      return Promise.all(registrations.map((registration) => registration.unregister()))
    }).finally(() => {
      if (!cancelled) setReady(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return ready
}

export function AppSerwistProvider({ children }: Props) {
  const swReady = useDevServiceWorkerCleanup()

  if (!swReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">
        Загрузка…
      </div>
    )
  }

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={isDev}
      cacheOnNavigation={!isDev}
      reloadOnOnline={!isDev}
    >
      {children}
    </SerwistProvider>
  )
}

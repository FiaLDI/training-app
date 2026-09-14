'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

import { useSessionStore } from '@/entities/session/model/store'
import { EmptyState } from '@/shared/ui/empty-state'

type Props = {
  children?: ReactNode
  action?: string
}

export function CloudRequired({ children, action = 'Это доступно в облачном аккаунте.' }: Props) {
  const mode = useSessionStore((s) => s.mode)
  if (mode === 'cloud') return <>{children}</>
  return (
    <EmptyState>
      {action}{' '}
      <Link href="/login" className="text-[var(--accent)] hover:underline">
        Войти
      </Link>
    </EmptyState>
  )
}

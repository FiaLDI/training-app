'use client'

import { ReactNode } from 'react'
import { ViewTransition } from 'react'

type Props = {
  pathname: string
  enabled?: boolean
  children: ReactNode
}

export function PageTransition({ pathname, enabled = true, children }: Props) {
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <ViewTransition key={pathname} enter="tab-fade" exit="tab-fade" default="none">
      <div className="tab-content-slot">{children}</div>
    </ViewTransition>
  )
}

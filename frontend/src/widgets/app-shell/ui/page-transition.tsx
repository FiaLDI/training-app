'use client'

import { ReactNode } from 'react'

type Props = {
  pathname: string
  enabled?: boolean
  children: ReactNode
}

/** Content slot only — View Transitions freeze the whole UI until in-flight fetches finish. */
export function PageTransition({ children }: Props) {
  return <div className="tab-content-slot">{children}</div>
}

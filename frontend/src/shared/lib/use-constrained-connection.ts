'use client'

import { useEffect, useState } from 'react'

import {
  isConstrainedConnection,
  subscribeConnectionChange,
} from '@/shared/lib/network-constraints'

export function useConstrainedConnection(): boolean {
  const [constrained, setConstrained] = useState(false)

  useEffect(() => {
    const read = () => setConstrained(isConstrainedConnection())
    read()
    return subscribeConnectionChange(read)
  }, [])

  return constrained
}

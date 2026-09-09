type NetworkConnection = {
  saveData?: boolean
  effectiveType?: string
  addEventListener?: (type: 'change', listener: () => void) => void
  removeEventListener?: (type: 'change', listener: () => void) => void
}

function getConnection(): NetworkConnection | undefined {
  if (typeof navigator === 'undefined') return undefined
  return (navigator as Navigator & { connection?: NetworkConnection }).connection
}

export function isConstrainedConnection(
  connection: NetworkConnection | undefined = getConnection(),
): boolean {
  if (!connection) return false
  if (connection.saveData) return true
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}

export function subscribeConnectionChange(listener: () => void): () => void {
  const connection = getConnection()
  connection?.addEventListener?.('change', listener)
  return () => connection?.removeEventListener?.('change', listener)
}

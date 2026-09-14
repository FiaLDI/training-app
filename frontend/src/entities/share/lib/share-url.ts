export function publicSharePath(token: string): string {
  return `/share/${encodeURIComponent(token)}`
}

export function publicShareUrl(token: string): string {
  if (typeof window === 'undefined') return publicSharePath(token)
  return `${window.location.origin}${publicSharePath(token)}`
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0]
      return id || null
    }
    if (
      parsed.hostname.includes('youtube.com') ||
      parsed.hostname.includes('youtube-nocookie.com')
    ) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v')
      }
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/?]+)/)
      if (embedMatch) return embedMatch[1] ?? null
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/?]+)/)
      if (shortsMatch) return shortsMatch[1] ?? null
    }
  } catch {
    return null
  }
  return null
}

export function buildYouTubeEmbedUrl(videoId: string, startSeconds?: number): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  })
  if (startSeconds != null && startSeconds > 0) {
    params.set('start', String(Math.floor(startSeconds)))
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

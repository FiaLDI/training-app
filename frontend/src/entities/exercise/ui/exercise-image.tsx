'use client'

import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/shared/lib/cn'

export const EXERCISE_IMAGE_SIZES = {
  card: '(max-width: 640px) 100vw, 33vw',
  session: '(max-width: 640px) 100vw, 55vw',
  hero: '(max-width: 768px) 100vw, 768px',
  gallery: '(max-width: 640px) 50vw, 33vw',
} as const

type Props = {
  src: string
  thumbUrl?: string | null
  mediumUrl?: string | null
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  onUnavailable?: () => void
}

function uniqueUrls(...urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const url of urls) {
    if (!url || seen.has(url)) continue
    seen.add(url)
    result.push(url)
  }
  return result
}

function buildSrcSet(
  src: string,
  thumbUrl: string | null | undefined,
  mediumUrl: string | null | undefined,
): string | undefined {
  const parts: string[] = []
  if (thumbUrl) parts.push(`${thumbUrl} 320w`)
  if (mediumUrl) parts.push(`${mediumUrl} 800w`)
  if (parts.length === 0) return undefined
  parts.push(`${src} 1600w`)
  return parts.join(', ')
}

export function ExerciseImage({
  src,
  thumbUrl,
  mediumUrl,
  alt,
  sizes,
  className,
  priority = false,
  onUnavailable,
}: Props) {
  const candidates = useMemo(
    () => uniqueUrls(thumbUrl, mediumUrl, src),
    [thumbUrl, mediumUrl, src],
  )
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [src, thumbUrl, mediumUrl])

  const current = candidates[index]
  if (!current) return null

  const srcSet = index === 0 ? buildSrcSet(src, thumbUrl, mediumUrl) : undefined

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('size-full', className)}
      onError={() => {
        const next = index + 1
        if (next >= candidates.length) {
          onUnavailable?.()
          setIndex(candidates.length)
          return
        }
        setIndex(next)
      }}
    />
  )
}

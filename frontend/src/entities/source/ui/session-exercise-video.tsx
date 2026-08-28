'use client'

import { useEffect, useRef, useState } from 'react'
import { Play } from 'lucide-react'

import { sourceApi } from '@/entities/source/api/source-api'
import { formatTimecodeSeconds } from '@/entities/source/lib/format-timecode'
import { isVideoSource } from '@/entities/source/lib/is-video-source'
import { buildYouTubeEmbedUrl, extractYouTubeVideoId } from '@/entities/source/lib/youtube'
import type { ExerciseSource, ExerciseTimecode } from '@/entities/source/model/types'
import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { localData } from '@/shared/lib/local-data'

type Props = {
  exerciseId: string
  className?: string
}

async function loadVideoSources(exerciseId: string, mode: 'local' | 'cloud') {
  if (mode === 'local') {
    return localData.sources.listByExercise(exerciseId).filter(isVideoSource)
  }
  const result = await sourceApi.listByExercise(exerciseId)
  return result.items.filter(isVideoSource)
}

async function loadTimecodes(sourceId: string, mode: 'local' | 'cloud') {
  if (mode === 'local') {
    return localData.timecodes.listBySource(sourceId)
  }
  return sourceApi.listTimecodes(sourceId)
}

function VideoPlayer({
  source,
  timecodes,
  startSeconds,
}: {
  source: ExerciseSource
  timecodes: ExerciseTimecode[]
  startSeconds: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const youtubeId = extractYouTubeVideoId(source.url)

  useEffect(() => {
    if (youtubeId || !videoRef.current) return
    videoRef.current.currentTime = startSeconds
    void videoRef.current.play().catch(() => undefined)
  }, [startSeconds, youtubeId])

  if (youtubeId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          key={`${youtubeId}-${startSeconds}`}
          src={buildYouTubeEmbedUrl(youtubeId, startSeconds)}
          title={source.title || 'Видео упражнения'}
          className="absolute inset-0 size-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        key={source.id}
        src={source.url}
        controls
        playsInline
        className="aspect-video w-full"
      />
    </div>
  )
}

export function SessionExerciseVideo({ exerciseId, className }: Props) {
  const mode = useSessionStore((s) => s.mode)
  const [sources, setSources] = useState<ExerciseSource[]>([])
  const [timecodes, setTimecodes] = useState<ExerciseTimecode[]>([])
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)
  const [startSeconds, setStartSeconds] = useState(0)
  const [loading, setLoading] = useState(true)

  const activeSource = sources.find((item) => item.id === activeSourceId) ?? sources[0] ?? null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void loadVideoSources(exerciseId, mode === 'local' ? 'local' : 'cloud')
      .then((items) => {
        if (cancelled) return
        setSources(items)
        setActiveSourceId(items[0]?.id ?? null)
        setStartSeconds(0)
      })
      .catch(() => {
        if (!cancelled) setSources([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId, mode])

  useEffect(() => {
    if (!activeSource) {
      setTimecodes([])
      return
    }

    let cancelled = false
    void loadTimecodes(activeSource.id, mode === 'local' ? 'local' : 'cloud')
      .then((items) => {
        if (!cancelled) setTimecodes(items)
      })
      .catch(() => {
        if (!cancelled) setTimecodes([])
      })
    return () => {
      cancelled = true
    }
  }, [activeSource?.id, mode])

  if (loading || !activeSource) return null

  return (
    <section className={cn('mb-5', className)}>
      {sources.length > 1 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => {
                setActiveSourceId(source.id)
                setStartSeconds(0)
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition',
                source.id === activeSource.id
                  ? 'bg-[var(--accent)] text-[var(--background)]'
                  : 'border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]',
              )}
            >
              {source.title || 'Видео'}
            </button>
          ))}
        </div>
      ) : null}

      <VideoPlayer
        source={activeSource}
        timecodes={timecodes}
        startSeconds={startSeconds}
      />

      {timecodes.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {timecodes.map((timecode) => (
            <button
              key={timecode.id}
              type="button"
              onClick={() => setStartSeconds(timecode.seconds)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--foreground)] transition hover:border-[var(--accent)]/40"
            >
              <Play className="size-3 text-[var(--accent)]" />
              <span className="tabular-nums">{formatTimecodeSeconds(timecode.seconds)}</span>
              {timecode.title ? (
                <span className="text-[var(--muted)]">· {timecode.title}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

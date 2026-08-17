'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Pencil, Star, Trash2 } from 'lucide-react'

import { DeleteExerciseButton } from '@/features/delete-exercise/ui/delete-exercise-button'
import { EditExerciseForm } from '@/features/edit-exercise/ui/edit-exercise-form'
import { sourceApi } from '@/entities/source/api/source-api'
import type { ExerciseSource } from '@/entities/source/model/types'
import {
  clearPrimaryImage,
  getPrimaryImageSourceId,
  getPrimaryImageUrl,
  isImageSource,
  withPrimaryImage,
} from '@/entities/exercise/lib/primary-image'
import { parseMuscleGroups } from '@/entities/exercise/model/muscle-groups'
import { useExerciseStore } from '@/entities/exercise/model/store'
import { useSessionStore } from '@/entities/session/model/store'
import { cn } from '@/shared/lib/cn'
import { localData } from '@/shared/lib/local-data'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'
import { Select } from '@/shared/ui/select'
import { DetailSkeleton } from '@/shared/ui/skeleton'

type Props = {
  id: string
}

export function ExerciseDetailPage({ id }: Props) {
  const current = useExerciseStore((s) => s.current)
  const loading = useExerciseStore((s) => s.loading)
  const error = useExerciseStore((s) => s.error)
  const fetchOne = useExerciseStore((s) => s.fetchOne)
  const update = useExerciseStore((s) => s.update)
  const mode = useSessionStore((s) => s.mode)
  const [sources, setSources] = useState<ExerciseSource[]>([])
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState('youtube')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [sourceError, setSourceError] = useState<string | null>(null)

  async function loadSources() {
    if (mode === 'local') {
      setSources(localData.sources.listByExercise(id))
      return
    }
    const result = await sourceApi.listByExercise(id)
    setSources(result.items)
  }

  useEffect(() => {
    void fetchOne(id)
    void loadSources().catch(() => setSources([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchOne, mode])

  async function onAddSource(event: FormEvent) {
    event.preventDefault()
    setSourceError(null)
    try {
      if (mode === 'local') {
        localData.sources.create({
          exerciseId: id,
          type,
          title: title || null,
          url,
        })
      } else {
        await sourceApi.create({
          exerciseId: id,
          type,
          title: title || null,
          url,
        })
      }
      setTitle('')
      setUrl('')
      await loadSources()
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : 'Не удалось добавить источник')
    }
  }

  async function onRemoveSource(sourceId: string) {
    if (!current) return
    if (mode === 'local') {
      localData.sources.remove(sourceId)
    } else {
      await sourceApi.remove(sourceId)
    }
    if (getPrimaryImageSourceId(current) === sourceId) {
      await update(id, { metadata: clearPrimaryImage(current.metadata ?? {}) })
    }
    await loadSources()
  }

  async function onSetPrimary(source: ExerciseSource) {
    if (!current) return
    await update(id, {
      metadata: withPrimaryImage(current.metadata ?? {}, source),
    })
  }

  if (loading && !current) {
    return <DetailSkeleton />
  }

  if (error || !current) {
    return <p className="text-sm text-red-300">{error ?? 'Упражнение не найдено'}</p>
  }

  const primaryUrl = getPrimaryImageUrl(current)
  const primarySourceId = getPrimaryImageSourceId(current)
  const imageSources = sources.filter(isImageSource)
  const otherSources = sources.filter((source) => !isImageSource(source))

  return (
    <div>
      <Link
        href="/exercises"
        className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="size-4" />
        Упражнения
      </Link>

      <PageHeader
        title={current.name}
        description={current.description ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {!editing ? (
              <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
              </Button>
            ) : null}
            <DeleteExerciseButton
              exerciseId={id}
              exerciseName={current.name}
              onDeleted={() => {
                window.location.href = '/exercises'
              }}
            />
          </div>
        }
      />

      {editing ? (
        <EditExerciseForm
          exercise={current}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      ) : null}

      {primaryUrl ? (
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--accent)]/35 bg-[var(--surface)] ring-1 ring-[var(--accent)]/20">
          <div className="relative aspect-[16/10] w-full bg-[var(--surface-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryUrl}
              alt={current.name}
              className="size-full object-cover"
            />
            <span className="absolute top-3 left-3 rounded-md bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--accent-fg)]">
              Главное изображение
            </span>
          </div>
        </div>
      ) : null}

      <div className="mb-8 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
        {parseMuscleGroups(current.muscleGroup).map((group) => (
          <span
            key={group}
            className="rounded-md bg-[var(--surface-2)] px-2 py-1 text-[var(--foreground)]"
          >
            {group}
          </span>
        ))}
      </div>

      {imageSources.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Изображения</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imageSources.map((source) => {
              const isPrimary = source.id === primarySourceId
              return (
                <li
                  key={source.id}
                  className={cn(
                    'overflow-hidden rounded-xl border bg-[var(--surface)]',
                    isPrimary
                      ? 'border-[var(--accent)]/50 ring-1 ring-[var(--accent)]/25'
                      : 'border-[var(--border)]',
                  )}
                >
                  <div className="aspect-[4/3] bg-[var(--surface-2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={source.url}
                      alt={source.title || 'Изображение упражнения'}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <p className="truncate text-xs text-[var(--muted)]">
                      {source.title || 'изображение'}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        title={isPrimary ? 'Главное изображение' : 'Сделать главным'}
                        onClick={() => void onSetPrimary(source)}
                      >
                        <Star
                          className={cn(
                            'size-4',
                            isPrimary && 'fill-[var(--accent)] text-[var(--accent)]',
                          )}
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2"
                        onClick={() => void onRemoveSource(source.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">Источники</h2>
      <ul className="mb-4 space-y-2">
        {otherSources.map((source) => (
          <li
            key={source.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <p className="text-sm text-[var(--foreground)]">{source.title || source.type}</p>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--accent)]"
              >
                {source.url}
                <ExternalLink className="size-3" />
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void onRemoveSource(source.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={onAddSource}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <label className="space-y-1 text-xs text-[var(--muted)]">
          Тип
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-32">
            <option value="youtube">YouTube</option>
            <option value="article">статья</option>
            <option value="image">изображение</option>
            <option value="other">другое</option>
          </Select>
        </label>
        <label className="min-w-40 flex-1 space-y-1 text-xs text-[var(--muted)]">
          Название
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="min-w-56 flex-1 space-y-1 text-xs text-[var(--muted)]">
          Ссылка
          <Input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <Button type="submit">Добавить источник</Button>
        {sourceError ? <p className="w-full text-sm text-red-300">{sourceError}</p> : null}
      </form>
    </div>
  )
}

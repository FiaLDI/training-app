'use client'

import { FormEvent, useState } from 'react'

import type { CreateNewsInput, News, NewsSection } from '@/entities/news/model/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'

import { emptyNewsSection, prepareNewsSections, toDatetimeLocal } from '../model/news-form'
import { NewsSectionEditor } from './news-section-editor'

type Props = {
  initial?: News | null
  saving: boolean
  error: string | null
  onCancel: () => void
  onSubmit: (input: CreateNewsInput) => Promise<void>
}

function fromNews(news: News): {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  sections: NewsSection[]
} {
  return {
    slug: news.slug,
    title: news.title,
    excerpt: news.excerpt,
    publishedAt: toDatetimeLocal(news.publishedAt),
    sections:
      news.sections.length > 0
        ? news.sections.map((section) =>
            section.type === 'paragraphs'
              ? { ...section, paragraphs: [...section.paragraphs] }
              : { ...section, items: [...section.items] },
          )
        : [emptyNewsSection()],
  }
}

export function AdminNewsForm({ initial, saving, error, onCancel, onSubmit }: Props) {
  const seed = initial ? fromNews(initial) : null
  const [slug, setSlug] = useState(seed?.slug ?? '')
  const [title, setTitle] = useState(seed?.title ?? '')
  const [excerpt, setExcerpt] = useState(seed?.excerpt ?? '')
  const [publishedAt, setPublishedAt] = useState(
    seed?.publishedAt ?? toDatetimeLocal(new Date().toISOString()),
  )
  const [sections, setSections] = useState<NewsSection[]>(seed?.sections ?? [emptyNewsSection()])
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLocalError(null)
    const prepared = prepareNewsSections(sections)
    if (!prepared) {
      setLocalError('Добавьте хотя бы одну секцию с заголовком и текстом')
      return
    }
    if (!slug.trim() || !title.trim() || !excerpt.trim() || !publishedAt) {
      setLocalError('Заполните адрес, заголовок, описание и дату')
      return
    }
    await onSubmit({
      slug: slug.trim(),
      title: title.trim(),
      excerpt: excerpt.trim(),
      sections: prepared,
      publishedAt: new Date(publishedAt).toISOString(),
    })
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-[var(--muted)]">
          Заголовок
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
            placeholder="Что можно делать в IronLog"
          />
        </label>
        <label className="space-y-1 text-xs text-[var(--muted)]">
          Адрес (slug)
          <Input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            maxLength={80}
            placeholder="what-you-can-do"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Латиница, цифры и дефис"
          />
        </label>
      </div>

      <label className="block space-y-1 text-xs text-[var(--muted)]">
        Краткое описание
        <Textarea
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          required
          maxLength={500}
          placeholder="Коротко, что внутри новости"
        />
      </label>

      <label className="block max-w-xs space-y-1 text-xs text-[var(--muted)]">
        Дата публикации
        <Input
          type="datetime-local"
          value={publishedAt}
          onChange={(event) => setPublishedAt(event.target.value)}
          required
        />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium">Секции</p>
        <NewsSectionEditor sections={sections} onChange={setSections} />
      </div>

      {localError || error ? (
        <p className="text-sm text-red-300">{localError ?? error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {initial ? 'Сохранить' : 'Опубликовать'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
      </div>
    </form>
  )
}

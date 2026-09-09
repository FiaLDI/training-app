import type { NewsSection } from '@/entities/news/model/types'

export function emptyNewsSection(): NewsSection {
  return { type: 'paragraphs', heading: '', paragraphs: [''] }
}

export function prepareNewsSections(sections: NewsSection[]): NewsSection[] | null {
  const cleaned: NewsSection[] = []

  for (const section of sections) {
    const heading = section.heading.trim()
    if (!heading) continue

    if (section.type === 'paragraphs') {
      const paragraphs = section.paragraphs.map((item) => item.trim()).filter(Boolean)
      if (paragraphs.length === 0) continue
      cleaned.push({ type: 'paragraphs', heading, paragraphs })
      continue
    }

    const items = section.items.map((item) => item.trim()).filter(Boolean)
    if (items.length === 0) continue
    cleaned.push({ type: 'list', heading, items })
  }

  return cleaned.length > 0 ? cleaned : null
}

export function toDatetimeLocal(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

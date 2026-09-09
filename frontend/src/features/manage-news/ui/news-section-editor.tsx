import { Plus, Trash2 } from 'lucide-react'

import type { NewsSection } from '@/entities/news/model/types'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

import { emptyNewsSection } from '../model/news-form'

type Props = {
  sections: NewsSection[]
  onChange: (sections: NewsSection[]) => void
}

export function NewsSectionEditor({ sections, onChange }: Props) {
  function update(index: number, next: NewsSection) {
    onChange(sections.map((section, i) => (i === index ? next : section)))
  }

  function changeType(index: number, type: NewsSection['type']) {
    const current = sections[index]
    if (current.type === type) return
    if (type === 'list') {
      update(index, {
        type: 'list',
        heading: current.heading,
        items: current.type === 'paragraphs' ? current.paragraphs : current.items,
      })
      return
    }
    update(index, {
      type: 'paragraphs',
      heading: current.heading,
      paragraphs: current.type === 'list' ? current.items : current.paragraphs,
    })
  }

  function updateLine(index: number, lineIndex: number, value: string) {
    const current = sections[index]
    if (current.type === 'paragraphs') {
      update(index, {
        ...current,
        paragraphs: current.paragraphs.map((line, i) => (i === lineIndex ? value : line)),
      })
      return
    }
    update(index, {
      ...current,
      items: current.items.map((line, i) => (i === lineIndex ? value : line)),
    })
  }

  function addLine(index: number) {
    const current = sections[index]
    if (current.type === 'paragraphs') {
      update(index, { ...current, paragraphs: [...current.paragraphs, ''] })
      return
    }
    update(index, { ...current, items: [...current.items, ''] })
  }

  function removeLine(index: number, lineIndex: number) {
    const current = sections[index]
    if (current.type === 'paragraphs') {
      const paragraphs = current.paragraphs.filter((_, i) => i !== lineIndex)
      update(index, { ...current, paragraphs: paragraphs.length > 0 ? paragraphs : [''] })
      return
    }
    const items = current.items.filter((_, i) => i !== lineIndex)
    update(index, { ...current, items: items.length > 0 ? items : [''] })
  }

  return (
    <div className="space-y-3">
      {sections.map((section, index) => {
        const lines = section.type === 'paragraphs' ? section.paragraphs : section.items
        return (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-4"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-40 flex-1 space-y-1 text-xs text-[var(--muted)]">
                Заголовок секции
                <Input
                  value={section.heading}
                  onChange={(event) => update(index, { ...section, heading: event.target.value })}
                  placeholder="Например, Журнал"
                />
              </label>
              <label className="w-40 space-y-1 text-xs text-[var(--muted)]">
                Тип
                <Select
                  value={section.type}
                  onChange={(event) =>
                    changeType(index, event.target.value as NewsSection['type'])
                  }
                >
                  <option value="paragraphs">Абзацы</option>
                  <option value="list">Список</option>
                </Select>
              </label>
              {sections.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="px-2"
                  onClick={() => onChange(sections.filter((_, i) => i !== index))}
                  title="Удалить секцию"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              {lines.map((line, lineIndex) => (
                <div key={lineIndex} className="flex items-start gap-2">
                  <Textarea
                    value={line}
                    onChange={(event) => updateLine(index, lineIndex, event.target.value)}
                    placeholder={section.type === 'list' ? 'Пункт списка' : 'Абзац'}
                    className="min-h-20"
                  />
                  {lines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-1 px-2"
                      onClick={() => removeLine(index, lineIndex)}
                      title="Удалить"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => addLine(index)}>
                <Plus className="size-4" />
                {section.type === 'list' ? 'Пункт' : 'Абзац'}
              </Button>
            </div>
          </div>
        )
      })}

      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...sections, emptyNewsSection()])}
      >
        <Plus className="size-4" />
        Секция
      </Button>
    </div>
  )
}

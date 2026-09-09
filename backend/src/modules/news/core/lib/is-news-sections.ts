import type { NewsSection } from '../types'

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString)
}

export function isNewsSection(value: unknown): value is NewsSection {
  if (!value || typeof value !== 'object') return false
  const section = value as Record<string, unknown>
  if (!isNonEmptyString(section.heading)) return false
  if (section.type === 'paragraphs') return isNonEmptyStringArray(section.paragraphs)
  if (section.type === 'list') return isNonEmptyStringArray(section.items)
  return false
}

export function isNewsSections(value: unknown): value is NewsSection[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNewsSection)
}

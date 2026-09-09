export const SEED_ARCHIVE_VERSION = 1
export const PRIMARY_IMAGE_URL_KEY = 'primaryImageUrl'
export const PRIMARY_IMAGE_SOURCE_ID_KEY = 'primaryImageSourceId'
export const PRIMARY_IMAGE_THUMB_URL_KEY = 'primaryImageThumbUrl'
export const PRIMARY_IMAGE_MEDIUM_URL_KEY = 'primaryImageMediumUrl'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IMAGE_EXT_RE = /^\.(gif|png|jpe?g|webp|svg)$/i

export type SeedExercise = {
  id: string
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata: Record<string, unknown>
  primaryImage?: string
}

export type SeedArchive = {
  version: number
  exportedAt?: string
  items: SeedExercise[]
}

export type SeedSkipReason = 'id' | 'name'

export type SeedSkipped = {
  id: string
  name: string
  reason: SeedSkipReason
}

export type CatalogKey = {
  id: string
  name: string
  isSystem: boolean
}

export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function stripSeedMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  delete next[PRIMARY_IMAGE_URL_KEY]
  delete next[PRIMARY_IMAGE_SOURCE_ID_KEY]
  delete next[PRIMARY_IMAGE_THUMB_URL_KEY]
  delete next[PRIMARY_IMAGE_MEDIUM_URL_KEY]
  delete next.catalogSyncedAt
  delete next.sync
  return next
}

export function parseUploadFilename(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null
  const match = url.trim().match(/^\/upload\/([A-Za-z0-9._-]+)$/)
  if (!match) return null
  const filename = match[1]
  if (!filename || filename.includes('..')) return null
  return filename
}

export function seedImagePath(exerciseId: string, filename: string): string {
  const ext = extensionOf(filename) ?? '.bin'
  return `images/${exerciseId}${ext}`
}

export function parseSeedImagePath(relativePath: string): { exerciseId: string; ext: string } | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.?\//, '')
  const match = normalized.match(/^images\/([0-9a-f-]{36})(\.[A-Za-z0-9]+)$/i)
  if (!match) return null
  const exerciseId = match[1]
  const ext = match[2]
  if (!UUID_RE.test(exerciseId) || !IMAGE_EXT_RE.test(ext)) return null
  return { exerciseId, ext: ext.toLowerCase() }
}

export function extensionOf(filename: string): string | null {
  const match = filename.match(/(\.[A-Za-z0-9]+)$/)
  if (!match) return null
  const ext = match[1].toLowerCase()
  return IMAGE_EXT_RE.test(ext) ? ext : null
}

export function parseSeedArchive(raw: unknown): SeedArchive {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный архив: ожидается JSON-объект')
  }
  const body = raw as Record<string, unknown>
  if (!Array.isArray(body.items)) {
    throw new Error('Некорректный архив: нет массива items')
  }

  const items: SeedExercise[] = []
  for (const row of body.items) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    if (typeof item.id !== 'string' || !UUID_RE.test(item.id)) continue
    if (typeof item.name !== 'string' || item.name.trim() === '') continue
    const primaryImage =
      typeof item.primaryImage === 'string' && parseSeedImagePath(item.primaryImage)
        ? item.primaryImage.replace(/\\/g, '/')
        : undefined
    items.push({
      id: item.id,
      name: item.name.trim(),
      description: typeof item.description === 'string' ? item.description : null,
      muscleGroup: typeof item.muscleGroup === 'string' ? item.muscleGroup : null,
      difficulty: typeof item.difficulty === 'string' ? item.difficulty : null,
      metadata: stripSeedMetadata(
        item.metadata && typeof item.metadata === 'object'
          ? (item.metadata as Record<string, unknown>)
          : {},
      ),
      ...(primaryImage ? { primaryImage } : {}),
    })
  }

  const version =
    typeof body.version === 'number' && Number.isFinite(body.version)
      ? body.version
      : SEED_ARCHIVE_VERSION
  const exportedAt = typeof body.exportedAt === 'string' ? body.exportedAt : undefined

  return { version, exportedAt, items }
}

export function toSeedExercise(input: {
  id: string
  name: string
  description: string | null
  muscleGroup: string | null
  difficulty: string | null
  metadata?: Record<string, unknown>
  primaryImage?: string
}): SeedExercise {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    muscleGroup: input.muscleGroup,
    difficulty: input.difficulty,
    metadata: stripSeedMetadata(input.metadata),
    ...(input.primaryImage ? { primaryImage: input.primaryImage } : {}),
  }
}

export function dedupeSeedItems<T extends { id: string; name: string }>(
  items: T[],
): { items: T[]; skipped: SeedSkipped[] } {
  const byId = new Set<string>()
  const byName = new Map<string, string>()
  const kept: T[] = []
  const skipped: SeedSkipped[] = []

  for (const item of items) {
    const nameKey = normalizeExerciseName(item.name)
    if (byId.has(item.id)) {
      skipped.push({ id: item.id, name: item.name, reason: 'id' })
      continue
    }
    const existingNameId = byName.get(nameKey)
    if (existingNameId) {
      skipped.push({ id: item.id, name: item.name, reason: 'name' })
      continue
    }
    byId.add(item.id)
    byName.set(nameKey, item.id)
    kept.push(item)
  }

  return { items: kept, skipped }
}

export function classifySeedImport(
  items: SeedExercise[],
  existing: CatalogKey[],
): { toCreate: SeedExercise[]; skipped: SeedSkipped[] } {
  const { items: unique, skipped: internal } = dedupeSeedItems(items)
  const existingIds = new Set(existing.map((row) => row.id))
  const systemNames = new Map<string, string>()
  for (const row of existing) {
    if (!row.isSystem) continue
    const key = normalizeExerciseName(row.name)
    if (!systemNames.has(key)) systemNames.set(key, row.id)
  }

  const toCreate: SeedExercise[] = []
  const skipped = [...internal]

  for (const item of unique) {
    if (existingIds.has(item.id)) {
      skipped.push({ id: item.id, name: item.name, reason: 'id' })
      continue
    }
    const nameOwner = systemNames.get(normalizeExerciseName(item.name))
    if (nameOwner) {
      skipped.push({ id: item.id, name: item.name, reason: 'name' })
      continue
    }
    toCreate.push(item)
  }

  return { toCreate, skipped }
}

export function buildSeedArchive(items: SeedExercise[], exportedAt = new Date().toISOString()): SeedArchive {
  return {
    version: SEED_ARCHIVE_VERSION,
    exportedAt,
    items,
  }
}

import sharp from 'sharp'

export const THUMB_WIDTH = 320
export const MEDIUM_WIDTH = 800

export const THUMB_SUFFIX = '-thumb.webp'
export const MEDIUM_SUFFIX = '-md.webp'

const RASTER_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

export function isRasterImageMime(mimeType: string): boolean {
  return RASTER_MIME_TYPES.has(mimeType)
}

export function isGeneratedVariantFilename(name: string): boolean {
  return name.endsWith(THUMB_SUFFIX) || name.endsWith(MEDIUM_SUFFIX)
}

export function variantFilenames(id: string): { thumb: string; medium: string } {
  return {
    thumb: `${id}${THUMB_SUFFIX}`,
    medium: `${id}${MEDIUM_SUFFIX}`,
  }
}

export type GeneratedVariant = {
  kind: 'thumb' | 'medium'
  filename: string
  mimeType: 'image/webp'
  buffer: Buffer
}

async function toWebp(input: Buffer, width: number): Promise<Buffer> {
  return sharp(input, { animated: false, failOn: 'none' })
    .rotate()
    .resize({
      width,
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer()
}

export async function generateImageVariants(input: {
  id: string
  mimeType: string
  buffer: Buffer
}): Promise<GeneratedVariant[]> {
  if (!isRasterImageMime(input.mimeType)) return []

  const names = variantFilenames(input.id)
  const [thumb, medium] = await Promise.all([
    toWebp(input.buffer, THUMB_WIDTH),
    toWebp(input.buffer, MEDIUM_WIDTH),
  ])

  return [
    {
      kind: 'thumb',
      filename: names.thumb,
      mimeType: 'image/webp',
      buffer: thumb,
    },
    {
      kind: 'medium',
      filename: names.medium,
      mimeType: 'image/webp',
      buffer: medium,
    },
  ]
}

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.mp4',
  '.webm',
] as const

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
] as const

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export function isAllowedExtension(value: string): value is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(value)
}

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value)
}

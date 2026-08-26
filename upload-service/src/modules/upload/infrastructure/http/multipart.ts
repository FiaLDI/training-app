import type { Request } from 'express'
import multer from 'multer'

import {
  isAllowedExtension,
  isAllowedMimeType,
} from '../../core/file-rules'
import { DomainError } from '../../core/types'

export function createMemoryUpload(maxBytes: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const ext = (file.originalname.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase()
      if (!isAllowedExtension(ext) || !isAllowedMimeType(file.mimetype)) {
        cb(
          new DomainError(
            'Разрешены только изображения и короткие видео (jpg, png, gif, webp, mp4, webm)',
            'VALIDATION',
          ),
        )
        return
      }
      cb(null, true)
    },
  })
}

export function extractAccessToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)

  const cookie = req.headers.cookie
  if (!cookie) return null

  const match = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('access_token='))

  if (!match) return null
  return decodeURIComponent(match.slice('access_token='.length))
}

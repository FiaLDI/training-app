import { randomUUID } from 'crypto'
import path from 'path'

import {
  isAllowedExtension,
  isAllowedMimeType,
} from '../../file-rules'
import { generateImageVariants } from '../../image-variants'
import type { FileStoragePort } from '../../ports/file-storage.port'
import { DomainError, type IncomingFile, type StoredFile } from '../../types'

export type UploadFileInput = {
  file: IncomingFile | null
  maxBytes: number
  maxFiles: number
}

export class UploadFileUseCase {
  constructor(private readonly storage: FileStoragePort) {}

  async execute(input: UploadFileInput): Promise<StoredFile> {
    const file = input.file
    if (!file) {
      throw new DomainError('Файл не передан', 'VALIDATION')
    }

    if (file.size <= 0) {
      throw new DomainError('Пустой файл', 'VALIDATION')
    }

    if (file.size > input.maxBytes) {
      const mb = Math.round(input.maxBytes / (1024 * 1024))
      throw new DomainError(`Файл слишком большой (макс. ${mb} МБ)`, 'VALIDATION')
    }

    const ext = path.extname(file.originalName || '').toLowerCase()
    if (!isAllowedExtension(ext) || !isAllowedMimeType(file.mimeType)) {
      throw new DomainError(
        'Разрешены только изображения и короткие видео (jpg, png, gif, webp, mp4, webm)',
        'VALIDATION',
      )
    }

    const currentCount = await this.storage.countFiles()
    if (currentCount >= input.maxFiles) {
      throw new DomainError(
        `Достигнут лимит хранилища (${input.maxFiles} файлов)`,
        'VALIDATION',
      )
    }

    const id = randomUUID()
    const filename = `${id}${ext}`
    const stored = await this.storage.save(file, filename)

    try {
      const variants = await generateImageVariants({
        id,
        mimeType: file.mimeType,
        buffer: file.buffer,
      })
      for (const variant of variants) {
        const saved = await this.storage.save(
          {
            originalName: variant.filename,
            mimeType: variant.mimeType,
            size: variant.buffer.length,
            buffer: variant.buffer,
          },
          variant.filename,
        )
        if (variant.kind === 'thumb') stored.thumbUrl = saved.url
        if (variant.kind === 'medium') stored.mediumUrl = saved.url
      }
    } catch (error) {
      console.warn('image variants failed, keeping original', error)
    }

    return stored
  }
}

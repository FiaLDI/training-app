import { randomUUID } from 'crypto'
import path from 'path'

import {
  isAllowedExtension,
  isAllowedMimeType,
} from '../../file-rules'
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

    const filename = `${randomUUID()}${ext}`
    return this.storage.save(file, filename)
  }
}

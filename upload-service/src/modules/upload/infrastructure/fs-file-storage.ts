import fs from 'fs/promises'
import path from 'path'

import { isGeneratedVariantFilename } from '../core/image-variants'
import type { FileStoragePort } from '../core/ports/file-storage.port'
import type { IncomingFile, StoredFile } from '../core/types'

export class FsFileStorage implements FileStoragePort {
  constructor(
    private readonly uploadDir: string,
    private readonly publicPath: string,
  ) {}

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true })
  }

  async countFiles(): Promise<number> {
    const entries = await fs.readdir(this.uploadDir, { withFileTypes: true })
    return entries.filter(
      (entry) =>
        entry.isFile() &&
        entry.name !== '.gitkeep' &&
        !isGeneratedVariantFilename(entry.name),
    ).length
  }

  async save(file: IncomingFile, filename: string): Promise<StoredFile> {
    const absolute = path.join(this.uploadDir, filename)
    await fs.writeFile(absolute, file.buffer)

    return {
      filename,
      url: `${this.publicPath}/${filename}`,
      size: file.size,
      mimeType: file.mimeType,
      originalName: file.originalName,
    }
  }
}

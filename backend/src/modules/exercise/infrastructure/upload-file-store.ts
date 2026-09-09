import { randomUUID } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

import { extensionOf, parseUploadFilename } from '../core/lib/system-exercise-archive'

export function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) return path.resolve(process.env.UPLOAD_DIR)
  return path.resolve(process.cwd(), '..', 'upload')
}

export class UploadFileStore {
  constructor(private readonly uploadDir: string) {}

  async readByPublicUrl(url: string): Promise<{ bytes: Buffer; filename: string } | null> {
    const filename = parseUploadFilename(url)
    if (!filename) return null
    try {
      const bytes = await readFile(path.join(this.uploadDir, filename))
      return { bytes, filename }
    } catch {
      return null
    }
  }

  async writeImage(originalName: string, bytes: Buffer): Promise<{ url: string; filename: string }> {
    const ext = extensionOf(originalName) ?? '.bin'
    const filename = `${randomUUID()}${ext}`
    await mkdir(this.uploadDir, { recursive: true })
    await writeFile(path.join(this.uploadDir, filename), bytes)
    return { filename, url: `/upload/${filename}` }
  }
}

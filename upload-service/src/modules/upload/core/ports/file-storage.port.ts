import type { IncomingFile, StoredFile } from '../types'

export const FILE_STORAGE_PORT = Symbol('FILE_STORAGE_PORT')

export interface FileStoragePort {
  countFiles(): Promise<number>
  save(file: IncomingFile, filename: string): Promise<StoredFile>
}

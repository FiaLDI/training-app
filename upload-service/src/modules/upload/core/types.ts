export type AuthUser = {
  id: string
  email: string
  username?: string
  role: 'user' | 'admin'
}

export type IncomingFile = {
  originalName: string
  mimeType: string
  size: number
  buffer: Buffer
}

export type StoredFile = {
  filename: string
  url: string
  size: number
  mimeType: string
  originalName: string
  thumbUrl?: string
  mediumUrl?: string
}

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'VALIDATION'
      | 'NOT_FOUND'
      | 'UPSTREAM',
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

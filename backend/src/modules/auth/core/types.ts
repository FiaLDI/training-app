export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  username: string
  role: UserRole
  metadata: Record<string, unknown>
  createdAt: string
  lastLoginAt: string | null
  /** Unix seconds cutoff; tokens with iat below this are rejected even without Redis. */
  sessionsRevokedAt: string | null
}

/** Internal credential material — never sent to clients or put in the user cache. */
export interface UserCredentials {
  loginCodeHash: string
  loginCodeLookup: string
}

export type UserWithCredentials = User & UserCredentials

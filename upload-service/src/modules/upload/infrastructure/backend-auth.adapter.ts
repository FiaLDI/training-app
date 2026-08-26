import type { AuthPort } from '../core/ports/auth.port'
import { DomainError, type AuthUser } from '../core/types'

export class BackendAuthAdapter implements AuthPort {
  constructor(private readonly backendUrl: string) {}

  async requireAdmin(accessToken: string): Promise<AuthUser> {
    let response: Response
    try {
      response = await fetch(`${this.backendUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch (error) {
      console.error(
        `auth check failed (${this.backendUrl}/api/auth/me)`,
        error instanceof Error ? error.message : error,
      )
      throw new DomainError(
        `Не удалось проверить авторизацию (backend: ${this.backendUrl})`,
        'UPSTREAM',
      )
    }

    if (!response.ok) {
      throw new DomainError('Недействительный токен', 'UNAUTHORIZED')
    }

    const data = (await response.json()) as {
      id?: string
      email?: string
      username?: string
      role?: string
      user?: {
        id?: string
        email?: string
        username?: string
        role?: string
      }
    }

    const raw = data.user ?? data
    const role = raw.role === 'admin' ? 'admin' : 'user'

    if (!raw.id || !raw.email) {
      throw new DomainError('Недействительный токен', 'UNAUTHORIZED')
    }

    if (role !== 'admin') {
      throw new DomainError('Доступ только для администратора', 'FORBIDDEN')
    }

    return {
      id: raw.id,
      email: raw.email,
      username: raw.username,
      role,
    }
  }
}

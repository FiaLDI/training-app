import { apiRequest } from '@/shared/api/client'

export type AuthUser = {
  id: string
  email: string
  username: string
  role?: 'user' | 'admin'
  metadata: Record<string, unknown>
  createdAt: string
}

export type RegisterResult = {
  email: string
  created: boolean
  message: string
  /** Present only when a new account was created — show once. */
  loginCode?: string
}

export type AuthSessionResult = {
  user: AuthUser
  accessToken: string
}

export type AdminUser = {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  createdAt: string
  lastLoginAt: string | null
}

export type IssuedLoginCode = {
  id: string
  email: string
  username?: string
  loginCode: string
}

export const authApi = {
  register(email: string) {
    return apiRequest<RegisterResult>('/auth/register', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    })
  },

  login(code: string) {
    return apiRequest<AuthSessionResult>('/auth/login', {
      method: 'POST',
      body: { code },
      skipAuth: true,
    })
  },

  logout() {
    return apiRequest<{ ok: boolean }>('/auth/logout', {
      method: 'POST',
    })
  },

  me() {
    return apiRequest<AuthUser>('/auth/me')
  },

  listUsers() {
    return apiRequest<{ users: AdminUser[] }>('/auth/admin/users')
  },

  createUser(email: string) {
    return apiRequest<IssuedLoginCode>('/auth/admin/users', {
      method: 'POST',
      body: { email },
    })
  },

  resetLoginCode(userId: string) {
    return apiRequest<IssuedLoginCode>(`/auth/admin/users/${userId}/reset-code`, {
      method: 'POST',
    })
  },
}

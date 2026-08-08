import { API_URL } from '@/shared/config/env'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('ironlog:session')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null } }
    return parsed.state?.accessToken ?? null
  } catch {
    return null
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, skipAuth, ...rest } = options
  const token = skipAuth ? null : getAccessToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const data = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(data.message)) message = data.message.join(', ')
      else if (data.message) message = data.message
    } catch {
      // ignore parse errors
    }

    if (!message || message === response.statusText) {
      const fallback: Record<number, string> = {
        400: 'Некорректный запрос',
        401: 'Нужна авторизация',
        403: 'Доступ запрещён',
        404: 'Не найдено',
        409: 'Конфликт данных',
        500: 'Ошибка сервера',
      }
      message = fallback[response.status] ?? `Ошибка ${response.status}`
    }

    if (response.status === 401 && typeof window !== 'undefined' && !skipAuth) {
      try {
        localStorage.removeItem('ironlog:session')
      } catch {
        // ignore
      }
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    throw new ApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

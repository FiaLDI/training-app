import { useSessionStore } from '@/entities/session/model/store'
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

export class TimeoutError extends Error {
  constructor(message = 'Превышено время ожидания ответа сервера') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export function isRetriableWriteError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true
  if (error instanceof TypeError) return true
  if (error instanceof ApiError && (error.status === 0 || error.status >= 500)) return true
  return false
}

export function syncFailReason(
  error: unknown,
): 'timeout' | 'network' | 'server' {
  if (error instanceof TimeoutError) return 'timeout'
  if (error instanceof ApiError && error.status >= 500) return 'server'
  return 'network'
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  skipAuth?: boolean
  timeoutMs?: number
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
  const { body, headers, skipAuth, timeoutMs, signal, ...rest } = options
  const token = skipAuth ? null : getAccessToken()

  const controller = timeoutMs != null ? new AbortController() : null
  const timer =
    timeoutMs != null && controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  const onAbort = () => controller?.abort()
  if (signal && controller) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      credentials: 'include',
      signal: controller?.signal ?? signal,
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
        useSessionStore.setState({ mode: null, user: null, accessToken: null, hydrated: true })
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
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (
      error instanceof DOMException &&
      error.name === 'AbortError' &&
      timeoutMs != null
    ) {
      throw new TimeoutError()
    }
    if (error instanceof Error && error.name === 'AbortError' && timeoutMs != null) {
      throw new TimeoutError()
    }
    throw error
  } finally {
    if (timer != null) clearTimeout(timer)
    if (signal && controller) signal.removeEventListener('abort', onAbort)
  }
}
